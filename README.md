# SpeakUp Server

Welcome to the SpeakUp server repository! This Node.js server powers the language learning school application.

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
4. [Configuration](#configuration)
   - [Environment Variables](#environment-variables)
   - [Database Setup](#database-setup)
   - [Stripe Integration](#stripe-integration)
5. [Usage](#usage)
   - [Running the Server](#running-the-server)
   - [API Endpoints](#api-endpoints)
6. [Contributing](#contributing)
   - [Setting Up Local Development](#setting-up-local-development)
   - [Creating a Pull Request](#creating-a-pull-request)
7. [License](#license)

## Introduction

This Node.js server is the backend for the SpeakUp language learning school application. It provides essential functionalities such as user authentication, language learning modules, and payment processing.

## Features

- User authentication
- Language learning modules
- Stripe and SSLCommerz integration for payment processing

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Stripe Account](https://stripe.com/)
- [SSLCommerz Account](https://www.sslcommerz.com/)

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/uniquecoderrihan/speakup-server.git
    cd speakup-server
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

## Configuration

### Environment Variables

Copy the `.env.example` file to a new file named `.env` and fill in the required information:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/speakup
STRIPE_SECRET_KEY=your_stripe_secret_key
SSL_COMMERZ_STORE_ID=your_sslcommerz_store_id
SSL_COMMERZ_STORE_PASSWORD=your_sslcommerz_store_password
