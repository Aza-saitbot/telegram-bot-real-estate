const TelegramBot = require('node-telegram-bot-api');

const botToken = '6108666847:AAFwp6d0DJFKQyuj2AFdGNUv00FLnyqIR-0';

const targetAccountId = '999109125';

const groupId = -1001810854616;

let keywords = ['Купить недвижимость в Турции', 'Продать недвижимость в Турции', 'Недвижимость в Турции', 'Недвижимость', 'недвижимость возле моря Турция'];

const bot = new TelegramBot(botToken, { polling: true });

bot.onText(/.*/, (msg) => {
    let firstName = msg.from?.first_name
    let lastName = msg.from?.last_name ?? '';
    const chatId = msg.chat.id;
    const authorName = firstName + ' ' + lastName
    const messageText = msg.text;
    const messageTime = new Date(msg.date * 1000).toLocaleString(); // Конвертируем время сообщения
    const authorId = msg.from.id;
    const username = msg.from.username;

    console.log('msg',msg)
    console.log('authorName, messageText', authorName, messageText);

    const foundKeywords = keywords.filter(keyword => new RegExp(keyword, 'i').test(messageText));
    if (foundKeywords.length > 0) {
        const targetMessage = `Найдено ключевое слово в группе:\nАвтор: ${
            authorName}\nID: ${authorId}\nUsername: ${username}\nСообщение: ${messageText}`;
        bot.sendMessage(targetAccountId, targetMessage)
            .then(() => {
                console.log('Сообщение успешно отправлено на аккаунт Telegram');
            })
            .catch(error => {
                console.log('Ошибка при отправке сообщения на аккаунт Telegram:', error);
            });
    }
});

bot.on('polling_error', (error) => {
    console.log('Ошибка при мониторинге группы:', error);
});

bot.onText(/\/addkeyword (.+)/, (msg, match) => {
    const keyword = match[1].trim();
    if (keyword) {
        keywords.push(keyword);
        bot.sendMessage(msg.chat.id, `Ключевое слово "${keyword}" успешно добавлено.`);
    } else {
        bot.sendMessage(msg.chat.id, 'Вы не указали ключевое слово.');
    }
});

bot.onText(/\/listkeywords/, (msg) => {
    if (keywords.length > 0) {
        const keywordsList = keywords.join('\n');
        bot.sendMessage(msg.chat.id, `Текущие ключевые слова:\n\n${keywordsList}`);
    } else {
        bot.sendMessage(msg.chat.id, 'Список ключевых слов пуст.');
    }
});

bot.getChatMemberCount(groupId)
    .then(count => {
        console.log(`Бот запущен в группе с ID ${groupId}, количество участников: ${count}`);
    })
    .catch(error => {
        console.log('Произошла ошибка при получении количества участников группы:', error);
    });
