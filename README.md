# Fakturex Next

Aplikacja webowa do zarządzania fakturami, klientami i produktami. Backend w Django, frontend w React.

## Struktura projektu

```
fakturex-next-web/
├── backend/          ← Django REST API
│   ├── fakturex/     ← Główna konfiguracja
│   ├── invoices/     ← Moduł faktur
│   ├── customers/    ← Moduł klientów
│   ├── products/     ← Moduł produktów
│   ├── users/        ← Moduł użytkowników
│   ├── manage.py
│   └── requirements.txt
├── frontend/         ← React + Vite
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml
```

---

## Uruchomienie lokalne

### Backend

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
Backend działa na: http://localhost:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```
Frontend działa na: http://localhost:3000

---

## Wdrożenie na Railway (krok po kroku)

### Wymagania
- Konto na [Railway](https://railway.app)
- Repozytorium na GitHub (już masz: https://github.com/tup2s/fakturex-next-web)

---

### KROK 1: Zaloguj się na Railway

1. Wejdź na https://railway.app
2. Kliknij **Login** → zaloguj się przez GitHub

---

### KROK 2: Utwórz nowy projekt

1. Kliknij **New Project**
2. Wybierz **Empty Project** (pusty projekt)

---

### KROK 3: Dodaj bazę danych PostgreSQL

1. W projekcie kliknij **+ New**
2. Wybierz **Database** → **PostgreSQL**
3. Gotowe! Railway automatycznie utworzy bazę

---

### KROK 4: Dodaj Backend

1. Kliknij **+ New** → **GitHub Repo**
2. Wybierz repozytorium `fakturex-next-web`
3. **WAŻNE:** Po dodaniu, kliknij na serwis i przejdź do **Settings**
4. W sekcji **Source** znajdź **Root Directory**
5. Wpisz: `backend`
6. Kliknij **Deploy** lub poczekaj na automatyczny deploy

#### Zmienne środowiskowe dla Backend:
W **Variables** dodaj:

| Zmienna | Wartość |
|---------|---------|
| `SECRET_KEY` | `twoj-tajny-klucz-123-wygeneruj-losowy` |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `.railway.app` |

**Zmienne CORS/CSRF dodasz PO wygenerowaniu domeny frontendu (krok 6)**

---

### KROK 5: Dodaj Frontend

1. Kliknij **+ New** → **GitHub Repo**
2. Wybierz **to samo** repozytorium `fakturex-next-web`
3. Przejdź do **Settings** nowego serwisu
4. W **Root Directory** wpisz: `frontend`
5. Poczekaj na deploy

#### Zmienne środowiskowe dla Frontend:
W **Variables** dodaj:

| Zmienna | Wartość |
|---------|---------|
| `VITE_API_URL` | (dodasz w kroku 6) |

---

### KROK 6: Wygeneruj domeny publiczne

Dla **każdego** serwisu (backend i frontend):

1. Kliknij na serwis
2. Idź do **Settings** → **Networking**
3. Kliknij **Generate Domain**
4. Skopiuj wygenerowany URL (np. `https://xxx.railway.app`)

---

### KROK 7: Zaktualizuj zmienne środowiskowe

Teraz gdy masz domeny, wróć i uzupełnij:

#### Backend (Variables):
| Zmienna | Wartość |
|---------|---------|
| `CORS_ALLOWED_ORIGINS` | `https://twoj-frontend-xxx.railway.app` |
| `CSRF_TRUSTED_ORIGINS` | `https://twoj-frontend-xxx.railway.app,https://twoj-backend-xxx.railway.app` |

#### Frontend (Variables):
| Zmienna | Wartość |
|---------|---------|
| `VITE_API_URL` | `https://twoj-backend-xxx.railway.app/api` |

**Zamień `xxx` na rzeczywiste nazwy z Railway!**

---

### KROK 8: Połącz bazę danych z backendem

1. Kliknij na serwis **Backend**
2. W **Variables** kliknij **+ New Variable**
3. Kliknij **Add Reference** → wybierz **PostgreSQL** → `DATABASE_URL`
4. Railway automatycznie połączy bazę

---

### Gotowe!

Po wykonaniu wszystkich kroków:
- Frontend: `https://twoj-frontend-xxx.railway.app`
- Backend API: `https://twoj-backend-xxx.railway.app/api/`
- Admin Django: `https://twoj-backend-xxx.railway.app/admin/`

---

## Rozwiązywanie problemów

### Build się nie udaje?
- Sprawdź w **Deployments** → kliknij na deployment → zobacz logi
- Upewnij się że **Root Directory** jest ustawiony poprawnie

### Frontend nie łączy się z API?
- Sprawdź czy `VITE_API_URL` ma poprawny URL backendu
- Sprawdź czy `CORS_ALLOWED_ORIGINS` zawiera URL frontendu

### Baza danych nie działa?
- Sprawdź czy `DATABASE_URL` jest dodane jako Reference do PostgreSQL

---

## Licencja

MIT License