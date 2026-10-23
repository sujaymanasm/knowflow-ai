# KnowFlow AI — 5-Minute Live Demonstration Script

Follow this script for a flawless demonstration to recruiters, hiring managers, or colleagues.

---

### Step 1: Landing Page & Live Simulation (1 Minute)
1. Open the application at `http://localhost:5173`.
2. Highlight the clean dark navy & electric blue SaaS visual design.
3. Scroll to the **Interactive RAG Execution Preview**. Click between the two sample query pills:
   - "How does vector chunk overlap prevent context fragmentation?"
   - "What is the benefit of Reciprocal Rank Fusion (RRF) in hybrid retrieval?"
4. Click on the supporting citation pill to demonstrate how the right panel dynamically updates with the source document excerpt and cosine similarity score.

---

### Step 2: System Dashboard & Metrics (1 Minute)
1. Click **Dashboard** in the top navigation.
2. Note the real-time statistics: Total Documents, Indexed Documents, Workspaces, Conversations.
3. Review the **Pipeline Component Latency** chart showing Vector Search (~12ms), Hybrid RRF (~18ms), and Grounded LLM generation.
4. Point out the **Demo Mode** indicator explaining local 384-dimensional dense semantic vectors.

---

### Step 3: Document Library & Ingestion (1 Minute)
1. Click **Documents** in the navigation.
2. Demonstrate drag-and-drop file ingestion or click **Upload File** to upload `sample_data/sample_docs/deep_learning_system_design.txt`.
3. Observe the ingestion status change from `Processing` to `Indexed`.
4. Click the **Inspect** eye icon to open the **Document Viewer**, navigating through chunks and pages.

---

### Step 4: AI Chat Workspace & Citation Inspector (1 Minute)
1. Click **AI Chat** in the navigation.
2. In the left sidebar, click **New Chat**.
3. Click one of the suggested starter questions:
   - *"How does chunk overlap prevent sentence fragmentation during vector retrieval?"*
4. Watch the grounded answer appear along with measured latency statistics (e.g. `Retrieval: 14ms`).
5. Click the citation pill `[RAG System Architecture & Evaluation Guide, p.1]`.
6. Notice the **Citation Inspector** panel open on the right displaying the exact retrieved passage and relevance score.
7. Click **Helpful** to submit answer feedback.

---

### Step 5: Automated Evaluation & Search Explorer (1 Minute)
1. Click **Search** in the navigation. Run a query: `"vector cosine similarity"` and toggle between **Hybrid**, **Semantic**, and **Keyword** modes.
2. Click **Evaluation** in the navigation. Click **Run Evaluation Benchmark**.
3. Point out the resulting **100% Recall@k**, **MRR 1.000**, and inspect individual evaluation examples.
