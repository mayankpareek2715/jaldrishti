# JalDrishti — Urban Flood Intelligence & Emergency Command Center

> **Smart India Hackathon (SIH) Prototype**  
> An AI-powered, map-centric urban flood risk prediction, scenario simulation, and emergency response decision-support platform for metropolitan governance.

### ⏱️ JalDrishti in 30 Seconds
Urban flooding inflicts massive disruption and economic damage on Indian metropolises each monsoon season. Traditional meteorological forecasts provide coarse regional predictions 24–48 hours ahead, but fail to answer what city municipal corporations and disaster authorities actually need: **Which specific ward or underpass will submerge in the next 60 minutes?**

**JalDrishti solves this** by coupling real-time precipitation telemetry with physical GIS terrain metrics (elevation profiles, slope gradients, drainage density, and impervious surface ratio) via a calibrated XGBoost machine learning model. This equips emergency response cells to pre-emptively dispatch dewatering equipment, erect traffic diversions, and alert residents **before inundation strikes**.

---

## 🏗 System Architecture

```
                                  +------------------------------+
                                  |   React + Vite Frontend      |
                                  |   (Port 3000 / GIS UI)       |
                                  +--------------+---------------+
                                                 | REST API
                                                 v
                                  +------------------------------+
                                  |  Spring Boot 3 REST Backend  |
                                  |        (Port 8080)           |
                                  +-------+--------------+-------+
                                          |              |
                    JPA / JDBC SQL        |              | HTTP REST Client
                                          v              v
                  +-----------------------+--+  +--------+--------------------+
                  |  PostgreSQL 18.4 Database |  |  FastAPI ML Service (XGBoost)|
                  |  (Port 5432: `jaldrishti`)|  |  (Port 8000)               |
                  +--------------------------+  +-----------------------------+
```

---

## 🛠 Local Environment & Software Requirements

- **Operating System**: Windows 11
- **Java Development Kit**: OpenJDK 17.0.19 (or compatible JDK 17+)
- **Build Tool**: Apache Maven 3.9.11
- **Python**: Python 3.12.7 (with `xgboost`, `scikit-learn`, `fastapi`, `uvicorn`, `pandas`, `numpy`, `shap`)
- **Node.js**: v22.20.0 / npm 10.9.3
- **Database**: PostgreSQL 18.4 (Port 5432, database `jaldrishti`, password `2715`)

---

## 📊 ML Model Methodology & Performance Metrics

JalDrishti uses a calibrated **XGBoost Classifier** (`xgb-v2-calibrated`) trained on historical storm event datasets and static GIS terrain attributes (elevation, slope, drainage density, impervious surface area, historical flood frequency, and flood-prone status).

### Honest Evaluation Metrics (Independent 20% Test Split):
- **Accuracy**: `85.6%`
- **Precision**: `80.8%`
- **Recall**: `85.7%`
- **F1 Score**: `83.2%`
- **ROC-AUC**: `94.5%`
- **PR-AUC**: `93.9%`

### Confusion Matrix:
- True Positives: `42`
- True Negatives: `59`
- False Positives: `10`
- False Negatives: `7`

> **Note on Data Integrity**: The model does not report unrealistic 100% accuracy. Evaluation uses stratified sampling and rolling historical counts to prevent temporal data leakage.

---

## 📡 Data Taxonomy: Real vs Simulated vs Derived

| Data Type | Description & Sources |
|---|---|
| **REAL DATA** | Localities static GIS coordinates, elevation profiles, OpenStreetMap geometries, documented historical flood records (Bengaluru Sept 2022/2024, Bhubaneswar Sept 2021 Cyclone Gulab). |
| **SIMULATED DATA** | User-triggered scenario simulations (50mm, 70mm, 90mm, 110mm, 130mm rainfall intensity) and what-if stress tests. |
| **DERIVED DATA** | Machine learning risk probabilities, risk status tiers (`LOW`, `MODERATE`, `HIGH`, `SEVERE`), SHAP attribution weights, and emergency intervention zone rankings. |

---

## 🚀 Quick Startup Instructions

### 🐳 Option A: 1-Command Startup with Docker Compose (Recommended)
Spin up the entire stack (PostgreSQL, Python FastAPI ML Microservice, Spring Boot REST Backend, and React Vite Frontend with Nginx) with a single command:

```powershell
docker compose up --build
```
- Frontend UI: **[http://localhost:3000](http://localhost:3000)**
- Spring Boot API: **[http://localhost:8080/api/localities](http://localhost:8080/api/localities)**
- ML Microservice Docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**
- Database: automatically initialized and seeded with PostgreSQL 16 on port `5432`.

To stop the stack: `docker compose down`

---

### 💻 Option B: Local Native Setup (Windows 11)

#### 1. PostgreSQL Setup
Ensure PostgreSQL 18 is running on `localhost:5432`:
```powershell
# Create database and seed tables
$env:PGPASSWORD='2715'
psql -U postgres -c "CREATE DATABASE jaldrishti;"
psql -U postgres -d jaldrishti -f "database/schema.sql"
psql -U postgres -d jaldrishti -f "database/seed.sql"
```

### 2. Python ML Microservice (Port 8000)
```powershell
cd ml-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python model/build_training_dataset.py
python model/train.py
python -m uvicorn main:app --port 8000
```

### 3. Spring Boot Backend (Port 8080)
```powershell
cd backend
mvn clean spring-boot:run
```

### 4. React Frontend (Port 3000)
```powershell
cd frontend
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔌 API Endpoints Summary

- `GET /api/localities`: Fetch all monitored wards across Bengaluru and Bhubaneswar.
- `GET /api/risk-map?horizon=+1h`: Retrieve current risk predictions for map display.
- `GET /api/localities/{id}`: Fetch detailed terrain attributes, SHAP factors, and flood history.
- `POST /api/simulation`: Execute what-if rainfall simulation through the ML model.
- `POST /api/route-check`: Analyze OSRM road coordinates between origin & destination.
- `GET /api/citizen-reports`: Retrieve public citizen incident reports.
- `POST /api/citizen-reports`: Submit a new citizen flood report.
- `PUT /api/citizen-reports/{id}/status`: Verify/acknowledge citizen reports.
- `GET /api/interventions`: Get decision-support emergency resource allocation recommendations.

---

## 🎬 SIH Hackathon Presentation Demo Flow

1. **Open JalDrishti Dashboard** (`http://localhost:3000`).
2. **Bengaluru Sector Overview**: Observe the GIS map centered on Bengaluru showing monitored wards and baseline risk spectrum.
3. **Multi-City Switch**: Change sector dropdown from **Bengaluru** to **Bhubaneswar** — observe smooth generic city filtering across map, risk matrix, and telemetry panels.
4. **Locality Telemetry & SHAP Explanation**: Click **Nayapalli** or **Koramangala** — inspect elevation, drainage density, impervious area, and SHAP model attribution factors.
5. **Forecast Horizon Scrubber**: Click timeline steps (`+1h`, `+3h`, `+6h`) to view temporal risk evolution.
6. **Scenario Simulation Engine**: Select **90 mm** rainfall in the What-If Simulation panel — observe real ML inference update probabilities, raise risk tiers to **SEVERE**, highlight affected polygons, and flag simulation banners.
7. **Citizen Incident Reporting**: Click **+ REPORT INCIDENT** in header — submit a localized report ("Water level 1.8ft near Ejipura Junction").
8. **Admin / Government Command Center**: Navigate to **ADMIN CONTROL** (Passcode: `admin123`) — review unresolved alerts, verify citizen reports, and inspect **Recommended Emergency Intervention Zones** (dewatering pumps, barricades, rescue craft dispatch).
