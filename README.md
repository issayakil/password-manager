# MyPass - Password Manager

A simple, minimal password management application built with vanilla JavaScript.

## Features

- **User Registration** - Email, master password, and 3 security questions
- **Password Generator** - Suggest strong passwords with customizable options
- **Weak Password Warning** - Real-time strength indicator
- **Vault Storage** - Store Login, Credit Card, Identity, and Secure Notes
- **CRUD Operations** - Create, modify, delete vault items
- **Easy Copy** - Quick copy for username/password/URL (Login) and card number/CVV (Card)
- **Data Masking** - Sensitive data masked by default with unmask option
- **Auto-lock** - Vault locks after X minutes of inactivity
- **Clipboard Clear** - Auto-clears copied data after X minutes

## Running

```bash
npx serve .
```

Open http://localhost:3000

## Usage

1. Create an account with email, password, and 3 security questions
2. Log in to access your vault
3. Add items using the sidebar buttons
4. Click items to view details
5. Use 👁 to unmask sensitive data
6. Use 📋 to copy data

## Local Database

Uses IndexedDB for persistent local storage:
- `users` - User accounts and settings
- `vault` - Encrypted vault items
