# Fakturex Next

Fakturex Next is a web application designed for managing invoices, customers, and products. This project is structured into a backend built with Django and a frontend built with React.

## Project Structure

```
fakturex-next-web
├── backend
│   ├── fakturex
│   ├── invoices
│   ├── customers
│   ├── products
│   ├── users
│   ├── manage.py
│   └── requirements.txt
├── frontend
│   ├── src
│   ├── public
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .gitignore
├── docker-compose.yml
└── README.md
```

## Backend

The backend is built using Django and provides RESTful APIs for managing invoices, customers, products, and users. 

### Setup

1. Navigate to the `backend` directory.
2. Install the required packages:
   ```
   pip install -r requirements.txt
   ```
3. Run the migrations:
   ```
   python manage.py migrate
   ```
4. Start the development server:
   ```
   python manage.py runserver
   ```

## Frontend

The frontend is built using React and Vite. It provides a user-friendly interface for interacting with the backend APIs.

### Setup

1. Navigate to the `frontend` directory.
2. Install the required packages:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

## Features

- Manage invoices, customers, and products.
- User authentication and authorization.
- Responsive design for mobile and desktop.

## Deployment on Railway

### Prerequisites
- Konto na [Railway](https://railway.app)
- Projekt jest w repozytorium Git (GitHub, GitLab, etc.)

### Kroki wdrożenia

#### 1. Utwórz nowy projekt na Railway
1. Zaloguj się na [Railway](https://railway.app)
2. Kliknij **New Project** → **Deploy from GitHub repo**
3. Wybierz swoje repozytorium

#### 2. Dodaj bazę danych PostgreSQL
1. W projekcie kliknij **New** → **Database** → **PostgreSQL**
2. Railway automatycznie ustawi zmienną `DATABASE_URL`

#### 3. Skonfiguruj Backend
1. Kliknij **New** → **GitHub Repo** → wybierz repo
2. Ustaw **Root Directory**: `backend`
3. Dodaj zmienne środowiskowe:
   - `SECRET_KEY` - wygeneruj bezpieczny klucz
   - `DEBUG` - `False`
   - `ALLOWED_HOSTS` - `.railway.app`
   - `CORS_ALLOWED_ORIGINS` - URL frontendu (np. `https://twoj-frontend.railway.app`)
   - `CSRF_TRUSTED_ORIGINS` - URL frontendu i backendu

4. Railway automatycznie wykryje Django i użyje `Procfile`

#### 4. Skonfiguruj Frontend
1. Kliknij **New** → **GitHub Repo** → wybierz repo
2. Ustaw **Root Directory**: `frontend`
3. Dodaj zmienną środowiskową:
   - `VITE_API_URL` - URL backendu (np. `https://twoj-backend.railway.app/api`)

#### 5. Wygeneruj domeny
1. Dla każdego serwisu: **Settings** → **Networking** → **Generate Domain**
2. Zaktualizuj zmienne środowiskowe z rzeczywistymi URL-ami

### Zmienne środowiskowe

#### Backend
| Zmienna | Opis |
|---------|------|
| `SECRET_KEY` | Tajny klucz Django |
| `DEBUG` | `False` dla produkcji |
| `DATABASE_URL` | Automatycznie z PostgreSQL |
| `CORS_ALLOWED_ORIGINS` | URL frontendu |
| `CSRF_TRUSTED_ORIGINS` | Zaufane originy |

#### Frontend
| Zmienna | Opis |
|---------|------|
| `VITE_API_URL` | URL API backendu |

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.