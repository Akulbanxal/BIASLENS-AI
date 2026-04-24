from fastapi import FastAPI

app = FastAPI(title="BiasLens AI ML Service")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "biaslens-ai-ml"}
