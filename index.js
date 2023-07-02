const TelegramBot = require('node-telegram-bot-api');
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');
const XLSX = require('xlsx');

const uri = '';
const dbName = '';
const collectionName = 'L';

const botToken = '';
const targetAccountId = '';
const groupId = ;
const keywordsFilePath = './keywords.txt';

const exportFilePath = './found_messages.xlsx';

let keywords = loadKeywords();
let foundMessages = [];

// Создание клиента MongoDB
const client = new MongoClient(uri, { useNewUrlParser: true });

const bot = new TelegramBot(botToken, { polling: true });

const commands = [
    { command: 'listkeywords', description: 'Показать список ключевых слов' },
    { command: 'addkeyword', description: 'Добавить ключевое слово' },
    { command: 'removekeyword', description: 'Удалить ключевое слово' },
    { command: 'exportmessages', description: 'Выгрузить найденные сообщения' },
    { command: 'clearmessages', description: 'Очистить все записи о сообщениях' }

];

// Загрузка ключевых слов из файла
function loadKeywords() {
    try {
        const data = fs.readFileSync(keywordsFilePath, 'utf8');
        return data.split('\n').map((keyword) => keyword.trim()).filter(Boolean);
    } catch (error) {
        console.log('Ошибка при загрузке ключевых слов из файла:', error);
        return [];
    }
}

// Сохранение ключевых слов в файл
function saveKeywords() {
    try {
        const data = keywords.join('\n');
        fs.writeFileSync(keywordsFilePath, data, 'utf8');
    } catch (error) {
        console.log('Ошибка при сохранении ключевых слов в файл:', error);
    }
}

// Сохранение найденных сообщений в базу данных и массив
function saveFoundMessage(foundMessage) {
    foundMessages.push(foundMessage);

    client.db(dbName).collection(collectionName).insertOne(foundMessage, (err) => {
        if (err) {
            console.error('Ошибка при добавлении сообщения в базу данных:', err);
        }
    });
}

// Удаление всех записей о сообщениях из базы данных
function clearAllMessages (){
    client.connect((err) => {
        if (err) {
            console.log('Ошибка при подключении к базе данных:', err);
            return;
        }
console.log('dbName',dbName)
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        
        console.log('collection',collection)

        collection.deleteMany({}, (err, result) => {
            if (err) {
                console.log('Ошибка при удалении записей о сообщениях:', err);
                bot.sendMessage(targetAccountId, 'Произошла ошибка при удалении записей о сообщениях из базы данных.');
                return;
            }

            const deleteCount = result.deletedCount;
            console.log(`Удалено ${deleteCount} записей о сообщениях из базы данных.`);
            bot.sendMessage(targetAccountId, `Удалено ${deleteCount} записей о сообщениях из базы данных.`);
        });
    });
}

// Обработка команды /addkeyword
bot.onText(/\/addkeyword/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, 'Напишите ключевое слово для добавления')
        .then(() => {
            bot.once('message', (keywordMsg) => {
                const newKeyword = keywordMsg.text.trim();

                if (newKeyword) {
                    keywords.push(newKeyword);
                    saveKeywords(); // Сохранение ключевых слов в файл
                    bot.sendMessage(chatId, `Ключевое слово "${newKeyword}" успешно добавлено.`);
                } else {
                    bot.sendMessage(chatId, 'Вы не указали ключевое слово.');
                }
            });
        })
        .catch((error) => {
            console.log('Ошибка при отправке сообщения:', error);
        });
});

// Обработка команды /removekeyword
bot.onText(/\/removekeyword/, (msg) => {
    const chatId = msg.chat.id;

    if (keywords.length === 0) {
        bot.sendMessage(chatId, 'Список ключевых слов пуст.');
        return;
    }

    bot.sendMessage(chatId, 'Введите номер ключевого слова для удаления')
        .then(() => {
            bot.once('message', (keywordMsg) => {
                const keywordIndex = parseInt(keywordMsg.text.trim());

                if (isNaN(keywordIndex) || keywordIndex < 1 || keywordIndex > keywords.length) {
                    bot.sendMessage(chatId, 'Некорректный номер ключевого слова.');
                    return;
                }

                const removedKeyword = keywords.splice(keywordIndex - 1, 1)[0];
                saveKeywords(); // Сохранение ключевых слов в файл
                bot.sendMessage(chatId, `Ключевое слово "${removedKeyword}" успешно удалено.`);
            });
        })
        .catch((error) => {
            console.log('Ошибка при отправке сообщения:', error);
        });
});

// Обработка команды /exportmessages
bot.onText(/\/exportmessages/, (msg) => {
    const chatId = msg.chat.id;

    if (foundMessages.length === 0) {
        bot.sendMessage(chatId, 'Нет найденных сообщений для выгрузки.');
        return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(foundMessages);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Найденные сообщения');
    XLSX.writeFile(workbook, exportFilePath);

    bot.sendDocument(chatId, exportFilePath)
        .then(() => {
            console.log('Документ успешно отправлен на аккаунт Telegram');
        })
        .catch((error) => {
            console.log('Ошибка при отправке документа на аккаунт Telegram:', error);
        });
});

// Обработка входящих сообщений группы
bot.on('message', (msg) => {
    let firstName = msg.from?.first_name;
    let lastName = msg.from?.last_name ?? '';

    const authorName = firstName + ' ' + lastName;
    const messageText = msg.text;
    const messageTime = new Date(msg.date * 1000).toLocaleString(); // Конвертируем время сообщения
    const authorId = msg.from.id;
    const username = msg.from.username;
    const nameGroup = msg.chat.title;

    const foundKeywords = keywords.filter(keyword => new RegExp(keyword, 'i').test(messageText));
    if (foundKeywords.length > 0) {
        let targetMessage = `Найдено ключевое слово в группе ${nameGroup}:\nАвтор: ${authorName}\nID: ${authorId}\n`;

        if (username) {
            targetMessage += `Username: ${username}\n`;
        } else if (msg.from?.phone_number) {
            targetMessage += `Контактный номер: ${msg.from.phone_number}\n`;
        }

        targetMessage += `Сообщение: ${messageText}`;

        const options = {
            reply_markup: {
                inline_keyboard: []
            }
        };

        if (username) {
            options.reply_markup.inline_keyboard.push([
                {
                    text: 'Написать автору',
                    url: `https://t.me/${username}`
                }
            ]);
        }

        bot.sendMessage(targetAccountId, targetMessage, options)
            .then(() => {
                console.log('Сообщение успешно отправлено на аккаунт Telegram');
            })
            .catch(error => {
                console.log('Ошибка при отправке сообщения на аккаунт Telegram:', error);
            });

        // Сохранение найденного сообщения
        const foundMessage = {
            group: nameGroup,
            author: authorName,
            authorId: authorId,
            username: username || '',
            phoneNumber: msg.from?.phone_number || '',
            message: messageText,
            time: messageTime
        };
        saveFoundMessage(foundMessage);
    }
});

bot.on('polling_error', (error) => {
    console.log('Ошибка при мониторинге группы:', error);
});

bot.setMyCommands(commands)
    .then(() => {
        console.log('Команды успешно добавлены в меню бота');
    })
    .catch((error) => {
        console.log('Ошибка при установке команд в меню бота:', error);
    });

bot.onText(/\/listkeywords/, (msg) => {
    if (keywords.length > 0) {
        const keywordsList = keywords.join('\n');
        bot.sendMessage(msg.chat.id, `Текущие ключевые слова:\n\n${keywordsList}`);
    } else {
        bot.sendMessage(msg.chat.id, 'Список ключевых слов пуст.');
    }
});

// Обработка команды /clearmessages
bot.onText(/\/clearmessages/, (msg) => {
    clearAllMessages()
    bot.sendMessage(msg.chat.id, 'Все записи о сообщениях были успешно удалены из базы данных.');

});


bot.getChatMemberCount(groupId)
    .then(count => {
        console.log(`Бот запущен в группе с ID ${groupId}, количество участников: ${count}`);
    })
    .catch(error => {
        console.log('Произошла ошибка при получении количества участников группы:', error);
    });

client.connect((err) => {
    if (err) {
        console.error('Ошибка при подключении к базе данных:', err);
        return;
    }

    console.log('Подключение к базе данных успешно установлено');

    const db = client.db(dbName);
    db.createCollection(collectionName, (err) => {
        if (err) {
            console.error('Ошибка при создании коллекции в базе данных:', err);
            return;
        }

        console.log('Коллекция успешно создана');
    });
});
