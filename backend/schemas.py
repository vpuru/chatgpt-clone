from pydantic import BaseModel, field_validator

SUPPORTED_MODELS = {"gpt-5-nano-2025-08-07"}
SUPPORTED_ROLES = {"user", "system"}


class Message(BaseModel):
    role: str
    content: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in SUPPORTED_ROLES:
            raise ValueError(f"invalid role '{v}'. Supported roles: {sorted(SUPPORTED_ROLES)}")
        return v


class ChatRequest(BaseModel):
    model: str
    messages: list[Message]

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: str) -> str:
        if not v:
            raise ValueError("model must not be empty")
        if v not in SUPPORTED_MODELS:
            raise ValueError(
                f"unsupported model '{v}'. Supported models: {sorted(SUPPORTED_MODELS)}"
            )
        return v

    @field_validator("messages")
    @classmethod
    def validate_messages(cls, v: list[Message]) -> list[Message]:
        if not v:
            raise ValueError("messages must not be empty")
        return v
