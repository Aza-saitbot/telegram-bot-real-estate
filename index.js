const TelegramBot = require('node-telegram-bot-api');

const botToken = '6108666847:AAFwp6d0DJFKQyuj2AFdGNUv00FLnyqIR-0';

const targetAccountId = '999109125';

const groupId = -1001973111412;

let keywords = ['Купить недвижимость в Турции', 'Продать недвижимость в Турции', 'Недвижимость в Турции','Недвижимость'
,'недвижимость возле моря Турция'];

const bot = new TelegramBot(botToken, { polling: true });

// Обработка входящих сообщений группы
bot.onText(/.*/, (msg) => {
    const chatId = msg.chat.id;
    const authorName = msg.from.first_name + ' ' + msg.from.last_name;
    const messageText = msg.text;

    // Проверка наличия ключевых слов в сообщении
    const foundKeywords = keywords.filter(keyword => new RegExp(keyword, 'i').test(messageText));
    if (foundKeywords.length > 0) {
        // Отправка информации об авторе и тексте сообщения на аккаунт Telegram
        const targetMessage = `Найдено ключевое слово в группе:\nАвтор: ${authorName}\nСообщение: ${messageText}`;
        bot.sendMessage(targetAccountId, targetMessage);
    }
});

// Запуск мониторинга группы
bot.on('polling_error', (error) => {
    console.log('Ошибка при мониторинга группы!!!!:', error);
});

// Обработка команды добавления ключевого слова
bot.onText(/\/addkeyword (.+)/, (msg, match) => {
    const keyword = match[1].trim();
    if (keyword) {
        keywords.push(keyword);
        bot.sendMessage(msg.chat.id, `Ключевое слово "${keyword}" успешно добавлено.`);
    } else {
        bot.sendMessage(msg.chat.id, 'Вы не указали ключевое слово.');
    }
});

// Обработка команды запроса списка ключевых слов
bot.onText(/\/listkeywords/, (msg) => {
    if (keywords.length > 0) {
        const keywordsList = keywords.join('\n');
        bot.sendMessage(msg.chat.id, `Текущие ключевые слова:\n\n${keywordsList}`);
    } else {
        bot.sendMessage(msg.chat.id, 'Список ключевых слов пуст.');
    }
});

bot.getChatMembersCount(groupId).then((count) => {
    console.log(`Бот запущен в группе с ID ${groupId}, количество участников: ${count}`);
}).catch((error) => {
    console.log('Произошла ошибка при получении количества участников группы:', error);
});
