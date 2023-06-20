const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const botToken = '6108666847:AAFwp6d0DJFKQyuj2AFdGNUv00FLnyqIR-0';
const targetAccountId = '999109125';
const groupId = -1001810854616;
const keywordsFilePath = './keywords.txt';

let keywords = loadKeywords();

const bot = new TelegramBot(botToken, { polling: true });

const commands = [
    { command: 'listkeywords', description: 'Показать список ключевых слов' },
    { command: 'addkeyword', description: 'Добавить ключевое слово' },
    { command: 'removekeyword', description: 'Удалить ключевое слово' }
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

// Обработка входящих сообщений группы
bot.on('message', (msg) => {
    const firstName = msg.from?.first_name;
    const lastName = msg.from?.last_name ?? '';
    const chatId = msg.chat.id;
    const authorName = firstName + ' ' + lastName;
    const messageText = msg.text;
    const messageTime = new Date(msg.date * 1000).toLocaleString(); // Конвертируем время сообщения
    const authorId = msg.from.id;
    const username = msg.from.username;

    const foundKeywords = keywords.filter((keyword) => new RegExp(keyword, 'i').test(messageText));
    if (foundKeywords.length > 0) {
        const targetMessage = `Найдено ключевое слово в группе:\nАвтор: ${
            authorName}\nID: ${authorId}\nUsername: ${username}\nСообщение: ${messageText} \nВремя: ${messageTime}`;
        bot.sendMessage(targetAccountId, targetMessage)
            .then(() => {
                console.log('Сообщение успешно отправлено на аккаунт Telegram');
            })
            .catch((error) => {
                console.log('Ошибка при отправке сообщения на аккаунт Telegram:', error);
            });
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
        const keywordsList = keywords.map((keyword, index) => `${index + 1}. ${keyword}`).join('\n');
        bot.sendMessage(msg.chat.id, `Текущие ключевые слова:\n\n${keywordsList}`);
    } else {
        bot.sendMessage(msg.chat.id, 'Список ключевых слов пуст.');
    }
});

bot.getChatMemberCount(groupId)
    .then((count) => {
        console.log(`Бот запущен в группе с ID ${groupId}, количество участников: ${count}`);
    })
    .catch((error) => {
        console.log('Произошла ошибка при получении количества участников группы:', error);
    });
