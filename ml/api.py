from fastapi import APIRouter, HTTPException
from app.llm.mistral_baseline import process_csv_and_analyze
from app.schemas import ParseRequest, ParseResponse
from app.parsers.wb_parser import run_wb_parser

router = APIRouter()

@router.post("/parse-wb", response_model=ParseResponse)
def parse_wb_endpoint(payload: ParseRequest):
    try:
        print("Received URL to parse:", type(str(payload.url)))
        file_path = run_wb_parser(str(payload.url))
        summary = process_csv_and_analyze(file_path)
        return ParseResponse(
            status="ok",
            file_path=file_path,
            summary=summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
