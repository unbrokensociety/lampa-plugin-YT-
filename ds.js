// monitor.js - Плагин мониторинга для Lampa

// 1. Регистрируем плагин в системе Lampa
Lampa.Plugin.add({
    title: 'Мониторинг и статистика',
    description: 'Отображает время работы, текущий фильм и постер',
    version: '1.0.0',
    author: 'Ваше имя',
    // Функция, которая выполняется при загрузке плагина
    onInit: function() {
        // Здесь код для инициализации таймера и отслеживания
        this.startTime = Date.now();
        this.currentMovie = null;
        this.createUI(); // Создаем интерфейс для отображения
        this.startTracking(); // Начинаем отслеживать изменения
    },
    // Метод для создания интерфейса (overlay)
    createUI: function() {
        // Создаем HTML-элементы для отображения информации
        this.ui = {
            container: document.createElement('div'),
            time: document.createElement('div'),
            movieTitle: document.createElement('div'),
            poster: document.createElement('img')
        };
        // ... стилизация и добавление в DOM Lampa ...
    },
    // Метод для отслеживания изменений (например, через события)
    startTracking: function() {
        // Пример: подписка на события Lampa (если есть)
        // Lampa.Listener.follow('card_open', (event) => { ... });
        
        // Или: периодический поиск в DOM (не самый эффективный способ)
        setInterval(() => {
            this.checkCurrentMovie();
            this.updateUI();
        }, 1000); // Проверка каждую секунду
    },
    // Метод для поиска текущего фильма в интерфейсе
    checkCurrentMovie: function() {
        // 1. Найти элемент, содержащий название фильма (селектор может быть типа '.player__title')
        const titleElement = document.querySelector('.player-title'); // Условный селектор
        if (titleElement) {
            this.currentMovie = {
                title: titleElement.textContent,
                posterUrl: this.findPosterUrl() // Метод для поиска постера
            };
        }
    },
    // Метод для обновления интерфейса
    updateUI: function() {
        const elapsed = Date.now() - this.startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        this.ui.time.textContent = `Время работы: ${hours}ч ${minutes}м ${seconds}с`;
        if (this.currentMovie) {
            this.ui.movieTitle.textContent = `Сейчас: ${this.currentMovie.title}`;
            this.ui.poster.src = this.currentMovie.posterUrl;
        }
    },
    // Метод для поиска URL постера
    findPosterUrl: function() {
        // Искать в DOM ссылку на постер, связанный с текущим фильмом
        const posterElement = document.querySelector('.current-movie-poster img'); // Условный селектор
        return posterElement ? posterElement.src : null;
    },
    // Метод, вызываемый при закрытии плагина
    onDestroy: function() {
        clearInterval(this.trackingInterval); // Очистить интервал
        this.ui.container.remove(); // Удалить интерфейс
    }
});
