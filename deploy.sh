#!/bin/bash

echo "🚀 Деплой на сервер..."

# Пуш на GitHub
git add .
git status

echo ""
read -p "Введи описание правки (или Enter для 'update'): " MSG
MSG=${MSG:-update}

git commit -m "$MSG"
git push

# Обновление сервера
echo ""
echo "📡 Обновляю сервер..."
sshpass -p '9zjPXHsx8u448spc' ssh -o StrictHostKeyChecking=no root@83.166.247.37 "cd /var/www/cesar-site && git pull && pm2 restart cesar-site"

echo ""
echo "✅ Готово! Сайт обновлён."
