const crypto = require('crypto');

// Генерируем случайную строку длиной 64 символа
const secret = crypto.randomBytes(32).toString('hex');
console.log('Сгенерированный JWT_SECRET:');
console.log(secret);
console.log('\nДобавь эту строку в .env файл:');
console.log(`JWT_SECRET=${secret}`);