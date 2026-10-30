# Carbon Coach 🌱

**Track Smart. Live Green. Reduce Carbon.**

Carbon Coach is an AI-powered carbon-footprint tracking assistant
designed to help people understand the environmental impact of everyday
activities and make practical, lower-carbon choices.

Users can describe activities in natural language---such as travelling,
using electricity, eating meals, or generating waste---and receive
estimated greenhouse-gas emissions expressed as **kg CO₂e
(carbon-dioxide equivalent)**, along with suggestions for reducing their
footprint.

## ✨ Project Goals

-   Make personal carbon-footprint tracking conversational and easy to
    use.
-   Estimate emissions from everyday activities using documented
    emission factors.
-   Keep track of logged activities and show daily or weekly totals.
-   Provide practical reduction suggestions with estimated potential
    savings.
-   Make climate-awareness information easier to understand and act on.

## 🚀 Key Features

The project is designed around these capabilities:

-   **Conversational activity logging:** Describe an activity in
    everyday language.
-   **Activity categories:** Travel, electricity, food, and waste.
-   **Carbon-footprint estimation:** Convert activity data into
    estimated kg CO₂e using emission factors.
-   **Activity history:** Keep a record of activities during a user's
    session.
-   **Daily and weekly summaries:** Review totals and understand changes
    over time.
-   **Personalized reduction tips:** Get actionable suggestions based on
    recorded activities.
-   **AI assistant:** Use Gemini through the Google Agent Development
    Kit (ADK) for the conversational agent experience.

> Feature availability may depend on the current application build and
> configured services. Update this section as each feature is completed
> and tested.

## 🧰 Technology Stack

  Layer                         Technology
  ----------------------------- ------------------------------------
  Frontend                      React
  Styling                       Tailwind CSS
  AI model                      Google Gemini
  Agent framework               Google Agent Development Kit (ADK)
  Backend / calculations        Python
  Database and authentication   Supabase
  Charts and visualizations     Recharts
  Deployment target             Cloud Run (optional)

## 🏗️ High-Level Architecture

``` text
                 User
                  |
                  v
        React + Tailwind Interface
                  |
                  v
          AI Agent (Google ADK)
                  |
                  v
             Gemini Model
                  |
          +-------+--------+
          |                |
          v                v
   Python Calculation   Activity / User
        Tools             Data Store
          |                |
          v                v
  Emission Factors       Supabase
          |
          v
     kg CO₂e Estimate
          |
          v
  Dashboard, History and
    Reduction Suggestions
```

## 🌍 How It Works

1.  The user describes an everyday activity, for example, a journey or
    electricity usage.
2.  The application identifies the activity category and the information
    needed for an estimate.
3.  Calculation tools use the relevant emission factor and activity data
    to estimate emissions.
4.  The result is presented in kg CO₂e.
5.  The activity can be recorded so that totals and trends can be
    reviewed.
6.  The assistant can suggest practical actions to reduce future
    emissions.

**Calculation principle:**

``` text
Estimated emissions (kg CO₂e)
    = Activity amount × Emission factor
```

The emission factor must match the activity type and unit. Estimates
should identify their assumptions and data source; they should not be
presented as exact measurements.

## 🖥️ Run Locally

### Prerequisites

-   Node.js and npm
-   Python 3
-   Git
-   Google Gemini API key
-   Supabase project credentials, if database/authentication features
    are enabled

### 1. Clone the repository

``` bash
git clone https://github.com/mahesh2007-dsp/Carbon-Coach.git
cd Carbon-Coach
```

### 2. Install frontend dependencies

``` bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file only if the application requires these
variables. Use the exact variable names expected by the project code.

Example placeholders:

``` env
# Never commit real credentials
GOOGLE_API_KEY=your_gemini_api_key
```

Add any required Supabase URL and public/anonymous key using the
variable names expected by the application.

### 4. Start the frontend

``` bash
npm run dev
```

Open the local URL printed by the development server (commonly
`http://localhost:5173` for Vite).

### 5. Start the AI backend

If the project includes a separate Python / Google ADK agent, install
its dependencies and start it using the instructions in that backend's
directory or entry-point file. The exact command depends on the files
included in the repository.

## 🔐 Security

-   Do not commit API keys, OAuth client secrets, passwords, or private
    credentials.
-   Keep secret values in Bolt Secrets or server-side environment
    variables.
-   Keep `.env` files out of Git using `.gitignore`.
-   Do not expose the Gemini API key or OAuth client secret in frontend
    code.
-   Use server-side code for privileged API calls.

## 📁 Repository Structure

The repository currently includes frontend and application folders such
as:

``` text
Carbon-Coach/
├── public/          # Static assets
├── src/             # Frontend application source
├── supabase/        # Supabase configuration / resources
├── .bolt/           # Bolt project configuration
├── .gitignore
├── index.html
├── package.json
└── ...
```

The exact structure may change as the project develops. Add any Python
agent/backend folders here if they are part of your final repository.

## 🧪 Testing and Validation

Before presenting an emission estimate:

-   Check that the activity amount and unit are valid.
-   Use an emission factor appropriate to the activity and region where
    possible.
-   Show the calculation assumptions and units.
-   Handle missing information by asking the user rather than silently
    guessing.
-   Test daily and weekly totals against known sample calculations.

## 🛣️ Future Improvements

Potential next steps include:

-   Campus carbon-footprint leaderboard.
-   Telugu and Hindi conversational support.
-   More detailed charts and activity comparisons.
-   Golden evaluation cases for checking agent accuracy.
-   Deployment of the backend on Google Cloud Run.

## 🤝 Contributing

1.  Fork the repository.

2.  Create a feature branch:

    ``` bash
    git checkout -b feature/your-feature-name
    ```

3.  Commit your changes:

    ``` bash
    git commit -m "Add: describe your change"
    ```

4.  Push the branch and open a pull request.

## 👤 Author

**Mahesh P**

GitHub: [@mahesh2007-dsp](https://github.com/mahesh2007-dsp)

## 📄 License

No license has been specified yet. Add a `LICENSE` file before allowing
others to reuse, modify, or distribute this project.

------------------------------------------------------------------------

**Carbon Coach --- Track Smart. Live Green. Reduce Carbon.**
