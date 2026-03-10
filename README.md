# 🌱 Vasudha

### ML-Powered Pre-Harvest Agricultural Supply Chain Platform

> Turning farming from **uncertain selling** into **predictable planning**.

Vasudha is a full-stack agricultural coordination platform that helps farmers, buyers, and logistics providers coordinate **before harvest**, reducing price uncertainty, post-harvest waste, and distress selling.

The platform combines **machine learning, supply chain workflows, and multilingual accessibility** to create a predictable digital ecosystem for perishable crops.

---
## 🌐 Live Demo

Try the deployed application here:

👉 https://vasudha-navy.vercel.app/

# 🚨 Problem Statement

Perishable agriculture suffers from **extreme uncertainty**.

Farmers often make harvest decisions without knowing:

* Future market prices
* Buyer demand
* Logistics availability
* Weather-adjusted harvest windows

This results in three major issues:

### 1️⃣ Early Harvest

Farmers harvest early due to fear of price drops → **lower yield and reduced profit**

### 2️⃣ Late Harvest

Farmers delay harvest expecting higher prices → **spoilage or price crashes**

### 3️⃣ Distress Selling

Without buyer coordination before harvest → farmers are forced to sell to middlemen at **low prices**

Currently there is **no integrated system** that connects:

* crop planning
* market demand
* weather insights
* price intelligence
* logistics coordination

**before harvest happens.**

---

# 💡 Solution

Vasudha introduces a **predictive pre-harvest digital supply chain platform**.

Instead of reacting after harvest, the system allows coordination **before crops leave the farm.**

Farmers get:

* Harvest window predictions
* ML-based price forecasts
* Profit estimation
* Buyer commitments

Buyers get:

* Supply forecasting
* Early reservation of produce

Logistics providers get:

* Shipment planning in advance

This transforms farming from **reactive selling → predictive planning.**

---

# 🧠 Core Intelligence Layer

Vasudha integrates rule-based engines with machine learning models.

---

## 🌾 Crop Growth & Harvest Engine

This engine predicts the **optimal harvest window** using:

* crop growth cycles
* planting date
* weather conditions
* spoilage risk factors

Outputs include:

* predicted harvest window
* expected yield
* crop risk score

---

## 📈 ML Price Prediction Model

To reduce price uncertainty, Vasudha uses a **machine learning regression model**.

**Model Details**

* Algorithm: Random Forest Regressor
* Framework: Scikit-learn
* Training: Google Colab
* Data: Historical agricultural market prices

Outputs:

* predicted market price range
* price volatility insights

Model accuracy is evaluated using **R² metrics**.

---

## 💰 Profit Estimation Engine

The system estimates expected profit using:

```
Expected Profit =
Predicted Yield × Predicted Price − Cost Factors
```

Farmers can see **profit estimates before harvest**, enabling better decisions.

---

# 🔄 Digital Supply Chain Engine

Vasudha introduces a **structured supply chain coordination workflow**.

---

## 1️⃣ Demand-Supply Matching

The system automatically matches:

* farmer crop listings
* buyer demand requests

Matching criteria include:

* crop type
* quantity
* harvest window compatibility
* region availability

---

## 2️⃣ Commitment Workflow

Once a buyer finds a match:

Buyer commits → Farmer accepts → Inventory locked

Benefits:

* prevents overselling
* secures buyer demand early
* reduces post-harvest uncertainty

---

## 3️⃣ Inventory Control System

Tracks inventory in real time:

* Total Quantity
* Committed Quantity
* Available Quantity

Supports:

* primary crops
* byproducts (example: coconut husk)

---

## 4️⃣ Logistics Coordination

After commitment approval:

1. Shipment is automatically created
2. Logistics providers receive shipment request
3. Transport is proposed
4. Buyer approves shipment
5. Delivery lifecycle is tracked

Each shipment follows a **state machine workflow**.

---

# 🌍 Multilingual Accessibility

Vasudha supports regional farmer accessibility.

Languages supported:

* English
* Hindi
* Telugu

Implemented using **react-i18next**.

---

# 🔔 Event-Driven Notification System

Automated email notifications are triggered when:

* crop is finalized
* commitment is created
* commitment is accepted
* shipment is approved

This keeps all stakeholders informed in real time.

---

# 🏗 System Architecture

```
                +----------------------+
                |      Frontend        |
                |  React + TypeScript  |
                +----------+-----------+
                           |
                           | REST APIs
                           |
                +----------v-----------+
                |       Backend        |
                |       FastAPI        |
                | Matching Engine      |
                | Commitment Engine    |
                | Shipment Workflow    |
                +----------+-----------+
                           |
                           |
                +----------v-----------+
                |       Database       |
                |  Firebase Firestore  |
                +----------+-----------+
                           |
                           |
                +----------v-----------+
                |    ML Prediction     |
                | Random Forest Model  |
                | Price Forecasting    |
                +----------------------+
```

---

# 🧰 Tech Stack

### Frontend

* React 18
* TypeScript
* Vite
* Recharts
* react-i18next

### Backend

* FastAPI
* Python
* REST APIs
* Modular service architecture

### Database

* Firebase Firestore
* Real-time document database

### Authentication

* Firebase Authentication
* Email / Password login

### Machine Learning

* Python
* Pandas
* Scikit-learn
* Random Forest Regressor

### Notifications

* SMTP Email Service
* Gmail App Password integration

---

# 👥 Platform Roles

## 👨‍🌾 Farmer

Capabilities:

* crop planning
* harvest prediction
* profit estimation
* byproduct listing
* commitment management
* shipment tracking

---

## 🏬 Buyer

Capabilities:

* post demand requests
* view matched farmers
* create commitments
* approve shipments
* forecast incoming supply

---

## 🚚 Logistics Provider

Capabilities:

* receive shipment requests
* propose transport routes
* manage delivery lifecycle
* update shipment status

---

# ⚙️ Installation

## 1️⃣ Clone Repository

```
git clone https://github.com/SathwikPrabhu-07/Vasudha.git
cd Vasudha
```

---

## 2️⃣ Backend Setup

```
cd backend
pip install -r requirements.txt
```

Run backend server:

```
uvicorn main:app --reload
```

Backend runs on:

```
http://localhost:8000
```

---

## 3️⃣ Frontend Setup

```
cd frontend
npm install
```

Run frontend:

```
npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

---

## 4️⃣ Firebase Configuration

Create a `.env` file in frontend:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

# 🚀 Platform Workflow

### Step 1 — Farmer Registers Crop

Farmer enters crop details and planting date.

### Step 2 — Harvest Prediction

The system predicts the optimal harvest window.

### Step 3 — Price Prediction

ML model forecasts expected market prices.

### Step 4 — Profit Estimation

System calculates estimated profit range.

### Step 5 — Buyer Posts Demand

Buyers publish crop demand requests.

### Step 6 — Matching Engine

Platform matches farmers with buyers.

### Step 7 — Commitment Creation

Buyer commits → Farmer accepts → inventory locked.

### Step 8 — Shipment Creation

Shipment request sent to logistics providers.

### Step 9 — Delivery Lifecycle

Shipment is transported and delivery is completed.

---

# 🎯 Key Innovations

* Pre-harvest demand locking
* ML-based agricultural price prediction
* Supply chain state machine architecture
* Byproduct monetization support
* Multilingual farmer accessibility
* Role-based coordination platform

---

# 📊 Impact

Vasudha aims to:

* reduce post-harvest waste
* increase farmer bargaining power
* stabilize farmer income
* improve agricultural supply chain transparency
* digitize local agricultural trade

---

# 🧪 Future Improvements

* satellite crop monitoring
* AI yield prediction
* mandi price API integration
* mobile app for farmers
* cold-chain logistics integration

---

# 🤝 Contributing

Contributions are welcome.

Steps:

```
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Submit a Pull Request
```

---

# 📜 License

This project is licensed under the **MIT License**.

---

# 🌾 Vision

Vasudha aims to create a future where farming decisions are guided by **data, coordination, and predictability**, rather than uncertainty.

---

