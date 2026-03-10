🌱 Vasudha
ML-Powered Pre-Harvest Agricultural Supply Chain Platform

Turning farming from uncertain selling into predictable planning.

Vasudha is a full-stack agricultural coordination platform that enables farmers, buyers, and logistics providers to coordinate before harvest, reducing market uncertainty and post-harvest waste.

The platform combines machine learning, supply chain workflows, and multilingual accessibility to create a predictable digital ecosystem for perishable crops.

🚨 The Problem

Perishable agriculture suffers from extreme uncertainty.

Farmers usually make harvest decisions without knowing:

• Future market prices
• Buyer demand
• Logistics availability
• Weather-adjusted harvest windows

This leads to three major problems:

1️⃣ Early Harvest

Farmers harvest early due to fear of price drops → lower yield and profit

2️⃣ Late Harvest

Farmers wait too long expecting better prices → spoilage or market crashes

3️⃣ Distress Selling

Without pre-harvest buyer coordination → farmers are forced to sell at low prices to middlemen

Today there is no integrated digital system that connects:

crop growth

weather signals

price intelligence

buyer demand

logistics coordination

before harvest happens.

💡 The Solution

Vasudha introduces a predictive pre-harvest supply chain platform.

Instead of reacting after harvest, the system allows all participants to coordinate before the crop leaves the farm.

Farmers receive:

• Harvest window predictions
• Expected price forecasts
• Profit estimation
• Buyer commitments

Buyers receive:

• Supply forecasting
• Pre-harvest reservation capability

Logistics providers receive:

• Early shipment planning

This transforms agriculture from reactive selling → predictive planning.

🧠 Core Intelligence Layer

Vasudha combines data models and rule-based engines to guide agricultural decisions.

🌾 Crop Growth & Harvest Engine

This engine estimates the optimal harvest window using:

crop growth cycles

planting date

weather adjustments

spoilage risk estimation

Output includes:

• predicted harvest window
• expected yield
• risk score

📈 ML Price Prediction Model

To reduce price uncertainty, Vasudha integrates a machine learning price prediction system.

Model Details:

Algorithm: Random Forest Regressor

Training Data: Historical agricultural price datasets

Framework: Scikit-learn

Training Environment: Google Colab

Model outputs:

• expected market price range
• price volatility insight

Performance is evaluated using R² metrics to ensure predictive reliability.

💰 Profit Estimation Engine

Profit is estimated using a combined model:

Expected Profit =
Predicted Yield × ML Price Estimate − Cost Factors

Farmers can see potential earnings before harvest, enabling better decisions.

🔄 Digital Supply Chain Coordination Engine

The core innovation of Vasudha is its structured digital supply chain workflow.

Unlike traditional marketplaces, Vasudha introduces state-controlled coordination logic.

1️⃣ Demand-Supply Matching

The system automatically matches:

farmer crop listings

buyer demand requests

Matching criteria include:

• crop type
• quantity
• harvest window compatibility
• regional availability

2️⃣ Commitment Workflow

Once a buyer finds a match:

Buyer commits → Farmer accepts → Inventory locked

This ensures:

• demand security for farmers
• supply reservation for buyers
• prevention of overselling

3️⃣ Inventory Control System

Vasudha tracks inventory in real time.

Inventory states include:

Total Quantity

Committed Quantity

Available Quantity

Supported inventory types:

• primary crops
• byproducts (example: coconut husk)

This enables farmers to monetize secondary agricultural outputs.

4️⃣ Shipment & Logistics Coordination

After commitment approval:

Shipment is automatically created

Logistics providers receive shipment requests

Transport is proposed

Buyer approves shipment

Delivery lifecycle is tracked

Each shipment follows a structured state machine ensuring supply chain consistency.

🌍 Multilingual Accessibility

Vasudha is designed for regional farmers.

Supported languages:

• English
• Hindi
• Telugu

The entire UI dynamically switches using react-i18next, ensuring accessibility for local users.

🔔 Event-Driven Notification System

To ensure transparency, automated notifications are triggered for key actions.

Email alerts are sent when:

• crop is finalized
• commitment is created
• commitment is accepted
• shipment is approved

This keeps all actors updated in real time.

🏗 System Architecture
           ┌────────────────────────┐
           │        Frontend        │
           │   React + TypeScript   │
           └──────────┬─────────────┘
                      │ API Calls
                      ▼
           ┌────────────────────────┐
           │        Backend         │
           │        FastAPI         │
           │  Supply Chain Engine   │
           │  Matching Algorithms   │
           │  Shipment State Logic  │
           └──────────┬─────────────┘
                      │
                      ▼
           ┌────────────────────────┐
           │        Database        │
           │   Firebase Firestore   │
           └──────────┬─────────────┘
                      │
                      ▼
           ┌────────────────────────┐
           │     ML Prediction      │
           │ Random Forest Model    │
           │   Price Forecasting    │
           └────────────────────────┘
🧰 Tech Stack
Frontend

React 18

TypeScript

Vite

Recharts

react-i18next

Backend

FastAPI

Python

REST APIs

Modular service architecture

Core modules include:

• matching engine
• commitment engine
• shipment state machine

Database

Firebase Firestore

Features:

real-time updates

scalable document database

role-based data access

Authentication

Firebase Authentication

email/password login

role-based access

User roles:

• Farmer
• Buyer
• Logistics

Machine Learning

Python

Pandas

Scikit-learn

Random Forest Regressor

Model training done in Google Colab and integrated into backend services.

Notifications

Email alerts implemented using:

SMTP + Gmail App Password

👥 Platform Roles
👨‍🌾 Farmer

Capabilities:

Crop planning

Harvest prediction

Profit estimation

Byproduct listing

Commitment acceptance

Shipment tracking

🏬 Buyer

Capabilities:

Demand posting

View matched farmers

Create commitments

Approve shipments

Forecast incoming supply

🚚 Logistics

Capabilities:

Receive shipment requests

Propose transportation

Manage delivery lifecycle

Update shipment states

⚙️ Installation
1️⃣ Clone Repository
git clone https://github.com/YOUR_USERNAME/vasudha.git
cd vasudha
2️⃣ Backend Setup
cd backend
pip install -r requirements.txt

Run server:

uvicorn main:app --reload

Backend runs on:

http://localhost:8000
3️⃣ Frontend Setup
cd frontend
npm install

Run frontend:

npm run dev

Frontend runs on:

http://localhost:5173
4️⃣ Configure Firebase

Create .env file with:

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
🚀 Usage Workflow
Step 1 — Farmer Plans Crop

Farmer enters crop details and planting date.

Step 2 — System Predicts Harvest

Harvest engine predicts optimal harvest window.

Step 3 — ML Predicts Price

ML model estimates expected market price.

Step 4 — Profit Estimation

System shows estimated profit range.

Step 5 — Buyer Posts Demand

Buyer posts crop demand.

Step 6 — Matching Engine

System finds compatible farmers.

Step 7 — Commitment Creation

Buyer commits → farmer accepts.

Inventory gets locked.

Step 8 — Logistics Planning

Shipment is created and transport is proposed.

Step 9 — Delivery Tracking

Shipment moves through lifecycle until delivery completion.

🎯 Key Innovations

• Pre-harvest demand locking
• ML-based agricultural price prediction
• Supply chain state machine architecture
• Byproduct monetization support
• Multilingual farmer accessibility
• Role-based supply chain coordination

📊 Impact

Vasudha aims to:

• reduce post-harvest waste
• increase farmer bargaining power
• stabilize income
• improve supply chain transparency
• digitize regional agricultural trade

🧪 Future Improvements

Satellite-based crop monitoring

AI yield prediction models

Market demand forecasting

Integrated cold-chain logistics

Mobile app for farmers

Government mandi price integration

🤝 Contributing

Contributions are welcome.

Steps:

Fork the repository

Create a feature branch

Commit changes

Submit a pull request

📜 License

This project is licensed under the MIT License.

🏁 Project Vision

Vasudha aims to build a world where farming decisions are guided by data, coordination, and predictability rather than uncertainty.

By integrating intelligence, supply chain workflows, and accessibility, the platform moves agriculture toward a digitally coordinated ecosystem.
