class WeatherApp {
    constructor() {
        this.apiKey = '7106209ca95587149c3fd4bf065fd19b'; 
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.initializeElements();
        this.bindEvents();
        this.loadStoredLocation();
    }

    initializeElements() {
        this.cityInput = document.getElementById('cityInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.locationBtn = document.getElementById('locationBtn');
        this.weatherContainer = document.getElementById('weatherContainer');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.errorMessage = document.getElementById('errorMessage');
        this.retryBtn = document.getElementById('retryBtn');
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.searchWeather());
        this.locationBtn.addEventListener('click', () => this.getCurrentLocation());
        this.retryBtn.addEventListener('click', () => this.hideError());
        
        this.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchWeather();
            }
        });

        this.cityInput.addEventListener('input', (e) => {
            this.validateInput(e.target.value);
        });

        this.cityInput.focus();
    }

    async searchWeather() {
        const city = this.cityInput.value.trim();
        
        if (!city) {
            this.showError('Please enter a city name');
            return;
        }

        const cityNameRegex = /^[a-zA-Z\s\-']+$/;
        if (!cityNameRegex.test(city)) {
            this.showError('Please enter a valid city name (letters, spaces, hyphens, and apostrophes only)');
            return;
        }

        if (city.length < 2) {
            this.showError('City name must be at least 2 characters long');
            return;
        }

        if (city.length > 50) {
            this.showError('City name must be less than 50 characters');
            return;
        }

        const invalidInputs = ['country', 'state', 'province', 'region', 'zip', 'postal', 'code', 'number', '123', 'test', 'demo'];
        const lowerCity = city.toLowerCase();
        if (invalidInputs.includes(lowerCity) || /^\d+$/.test(city)) {
            this.showError('Please enter a valid city name, not a country, state, or postal code');
            return;
        }

        this.showLoading();
        try {
            const weatherData = await this.fetchWeatherData(city);
            this.displayWeather(weatherData);
            this.storeLocation(city);
        } catch (error) {
            this.showError(`Failed to fetch weather data for ${city}`);
            console.error('Weather fetch error:', error);
        }
    }

    async getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser');
            return;
        }

        this.showLoading();
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const weatherData = await this.fetchWeatherByCoords(latitude, longitude);
                    this.displayWeather(weatherData);
                } catch (error) {
                    this.showError('Failed to fetch weather data for your location');
                    console.error('Geolocation weather fetch error:', error);
                }
            },
            (error) => {
                let errorMsg = 'Unable to retrieve your location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMsg = 'Location request timed out';
                        break;
                }
                this.showError(errorMsg);
            },
            {
                timeout: 10000,
                enableHighAccuracy: true
            }
        );
    }

    async fetchWeatherData(city) {
        try {
            const response = await fetch(`${this.baseUrl}/weather?q=${city}&appid=${this.apiKey}&units=metric`);
            if (!response.ok) {
                throw new Error(`City not found: ${city}`);
            }
            const data = await response.json();
            const forecastData = await this.fetchForecastData(data.coord.lat, data.coord.lon);
            return {
                ...data,
                forecast: forecastData
            };
        } catch (error) {
            throw new Error(`Failed to fetch weather data: ${error.message}`);
        }
    }

    async fetchWeatherByCoords(lat, lon) {
        try {
            const response = await fetch(`${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`);
            if (!response.ok) {
                throw new Error('Location not found');
            }
            const data = await response.json();
            const forecastData = await this.fetchForecastData(lat, lon);
            return {
                ...data,
                forecast: forecastData
            };
        } catch (error) {
            throw new Error(`Failed to fetch weather data: ${error.message}`);
        }
    }

    async fetchForecastData(lat, lon) {
        try {
            const response = await fetch(`${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`);
            if (!response.ok) {
                throw new Error('Failed to fetch forecast data');
            }
            const data = await response.json();
            return this.processForecastData(data.list);
        } catch (error) {
            console.error('Forecast fetch error:', error);
            return null;
        }
    }

    processForecastData(forecastList) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const forecast = [];
        const processedDays = new Set();
        
        for (let i = 0; i < forecastList.length && processedDays.size < 5; i++) {
            const item = forecastList[i];
            const date = new Date(item.dt * 1000);
            const dayOfWeek = days[date.getDay()];
            
            if (!processedDays.has(dayOfWeek)) {
                processedDays.add(dayOfWeek);
                forecast.push({
                    day: dayOfWeek,
                    temp: Math.round(item.main.temp),
                    description: item.weather[0].description,
                    icon: this.getWeatherIcon(item.weather[0].main)
                });
            }
        }
        
        return forecast;
    }

    generateMockWeatherData(cityName) {
        const weatherConditions = [
            { main: 'Clear', description: 'clear sky', icon: 'sun' },
            { main: 'Clouds', description: 'few clouds', icon: 'cloud' },
            { main: 'Rain', description: 'light rain', icon: 'cloud-rain' },
            { main: 'Snow', description: 'light snow', icon: 'snowflake' },
            { main: 'Thunderstorm', description: 'thunderstorm', icon: 'bolt' }
        ];

        const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
        
        return {
            name: cityName,
            main: {
                temp: Math.floor(Math.random() * 30) + 10,
                feels_like: Math.floor(Math.random() * 30) + 10,
                humidity: Math.floor(Math.random() * 40) + 40,
                pressure: Math.floor(Math.random() * 200) + 1000,
            },
            weather: [randomWeather],
            wind: {
                speed: Math.floor(Math.random() * 20) + 5,
                deg: Math.floor(Math.random() * 360)
            },
            visibility: Math.floor(Math.random() * 5000) + 5000,
            forecast: this.generateMockForecast()
        };
    }

    generateMockForecast() {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const forecast = [];
        
        for (let i = 1; i <= 5; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            
            forecast.push({
                day: days[date.getDay()],
                temp: Math.floor(Math.random() * 15) + 15,
                description: ['sunny', 'cloudy', 'rainy', 'partly cloudy'][Math.floor(Math.random() * 4)],
                icon: ['sun', 'cloud', 'cloud-rain', 'cloud-sun'][Math.floor(Math.random() * 4)]
            });
        }
        
        return forecast;
    }

    displayWeather(data) {
        this.hideLoading();
        this.hideError();

        const weatherIcon = this.getWeatherIcon(data.weather[0].main);
        const currentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const weatherHTML = `
            <div class="current-weather">
                <h2 class="city-name">${data.name}</h2>
                <div class="date-time">${currentDate}</div>
                
                <div class="weather-main">
                    <div class="weather-icon">
                        <i class="fas fa-${weatherIcon}"></i>
                    </div>
                    <div class="temperature-info">
                        <div class="temperature">${Math.round(data.main.temp)}°C</div>
                        <div class="weather-description">${data.weather[0].description}</div>
                    </div>
                </div>

                <div class="weather-details">
                    <div class="detail-item">
                        <i class="fas fa-thermometer-half"></i>
                        <div class="detail-label">Feels Like</div>
                        <div class="detail-value">${Math.round(data.main.feels_like)}°C</div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-tint"></i>
                        <div class="detail-label">Humidity</div>
                        <div class="detail-value">${data.main.humidity}%</div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-wind"></i>
                        <div class="detail-label">Wind Speed</div>
                        <div class="detail-value">${Math.round(data.wind.speed)} m/s</div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-eye"></i>
                        <div class="detail-label">Visibility</div>
                        <div class="detail-value">${(data.visibility / 1000).toFixed(1)} km</div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-compress-arrows-alt"></i>
                        <div class="detail-label">Pressure</div>
                        <div class="detail-value">${data.main.pressure} hPa</div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-compass"></i>
                        <div class="detail-label">Wind Direction</div>
                        <div class="detail-value">${this.getWindDirection(data.wind.deg)}</div>
                    </div>
                </div>
            </div>

            ${data.forecast ? `
                <div class="forecast-section">
                    <h3 class="forecast-title">5-Day Forecast</h3>
                    <div class="forecast-grid">
                        ${data.forecast.map(day => `
                            <div class="forecast-item">
                                <div class="forecast-day">${day.day}</div>
                                <div class="forecast-icon">
                                    <i class="fas fa-${day.icon}"></i>
                                </div>
                                <div class="forecast-temp">${day.temp}°C</div>
                                <div class="forecast-desc">${day.description}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        this.weatherContainer.innerHTML = weatherHTML;
        this.weatherContainer.classList.remove('hidden');
    }

    getWeatherIcon(weatherMain) {
        const iconMap = {
            'Clear': 'sun',
            'Clouds': 'cloud',
            'Rain': 'cloud-rain',
            'Snow': 'snowflake',
            'Thunderstorm': 'bolt',
            'Drizzle': 'cloud-drizzle',
            'Mist': 'smog',
            'Fog': 'smog',
            'Haze': 'smog',
            'Smoke': 'smog',
            'Dust': 'smog',
            'Sand': 'smog',
            'Ash': 'smog',
            'Squall': 'wind',
            'Tornado': 'tornado'
        };
        return iconMap[weatherMain] || 'cloud';
    }

    getWindDirection(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    showLoading() {
        this.loading.classList.add('show');
        this.weatherContainer.classList.add('hidden');
        this.hideError();
    }

    hideLoading() {
        this.loading.classList.remove('show');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.error.classList.add('show');
        this.weatherContainer.classList.add('hidden');
        this.hideLoading();
    }

    hideError() {
        this.error.classList.remove('show');
    }

    storeLocation(city) {
        localStorage.setItem('lastSearchedCity', city);
    }

    loadStoredLocation() {
        const storedCity = localStorage.getItem('lastSearchedCity');
        if (storedCity) {
            this.cityInput.value = storedCity;
        }
    }

    validateInput(input) {
        const cityInput = this.cityInput;
        
        cityInput.classList.remove('valid-input', 'invalid-input');
        
        if (!input.trim()) {
            return;
        }

        const cityNameRegex = /^[a-zA-Z\s\-']+$/;
        const invalidInputs = ['country', 'state', 'province', 'region', 'zip', 'postal', 'code', 'number', '123', 'test', 'demo'];
        const lowerInput = input.toLowerCase();

        if (cityNameRegex.test(input) && 
            input.length >= 2 && 
            input.length <= 50 && 
            !invalidInputs.includes(lowerInput) && 
            !/^\d+$/.test(input)) {
            cityInput.classList.add('valid-input');
        } else {
            cityInput.classList.add('invalid-input');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});

const utils = {
    formatDate: (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    getTimeOfDay: () => {
        const hour = new Date().getHours();
        if (hour < 6) return 'night';
        if (hour < 12) return 'morning';
        if (hour < 18) return 'afternoon';
        return 'evening';
    },

    convertTemperature: (temp, fromUnit, toUnit) => {
        if (fromUnit === toUnit) return temp;
        
        if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
            return Math.round((temp * 9/5) + 32);
        }
        if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
            return Math.round((temp - 32) * 5/9);
        }
        return temp;
    }
};

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('cityInput').focus();
    }
    
    if (e.key === 'Escape') {
        document.getElementById('cityInput').value = '';
        document.getElementById('cityInput').focus();
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
    });
}
