from pydantic import BaseModel, HttpUrl

class ParseRequest(BaseModel):
    url: HttpUrl

class ParseResponse(BaseModel):
    status: str
    file_path: str
    summary: str