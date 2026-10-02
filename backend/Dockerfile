FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.16 /uv /bin/uv

RUN useradd --create-home app
USER app
WORKDIR /home/app/backend

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/home/app/backend/.venv/bin:$PATH"

COPY --chown=app pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev

COPY --chown=app app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
