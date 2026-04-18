"""Rentvine Telegram bot — consumes the rentvine-mcp server as a stdio MCP client."""
import asyncio
import contextlib
import os

from anthropic import Anthropic
from dotenv import load_dotenv
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters

load_dotenv()

anthropic = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

ALLOWED_USER_IDS = {
    int(x) for x in os.environ.get("ALLOWED_TELEGRAM_USER_IDS", "").split(",") if x.strip()
}

MAX_TOOL_ROUNDS = 10

SYSTEM_PROMPT = """You are a property management assistant with live access to Rentvine data.
Answer questions about properties, leases, tenants, work orders, applications, and inspections.
Be concise — this is a Telegram chat. Use plain text, no markdown."""

# Populated at startup in main() after the MCP session initializes.
mcp_session: ClientSession | None = None
anthropic_tools: list[dict] = []


async def run_tool(name: str, inputs: dict) -> str:
    assert mcp_session is not None, "MCP session not initialized"
    result = await mcp_session.call_tool(name, inputs)
    texts = [block.text for block in result.content if hasattr(block, "text")]
    return "\n".join(texts) if texts else str(result)


async def ask_claude(user_message: str) -> str:
    messages = [{"role": "user", "content": user_message}]
    tool_rounds = 0

    while True:
        response = anthropic.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=anthropic_tools,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            return next(
                (block.text for block in response.content if hasattr(block, "text")),
                "No response.",
            )

        if response.stop_reason == "tool_use":
            tool_rounds += 1
            if tool_rounds > MAX_TOOL_ROUNDS:
                return "Request required too many steps. Please try a simpler question."
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = await run_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })
            messages.append({"role": "user", "content": tool_results})
        else:
            break

    return "Something went wrong."


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if ALLOWED_USER_IDS and update.effective_user.id not in ALLOWED_USER_IDS:
        await update.message.reply_text("Unauthorized.")
        return
    await update.effective_chat.send_action(ChatAction.TYPING)
    reply = await ask_claude(update.message.text)
    await update.message.reply_text(reply)


async def main():
    global mcp_session, anthropic_tools

    server_params = StdioServerParameters(
        command="npx",
        args=["-y", "rentvine-mcp"],
    )

    async with contextlib.AsyncExitStack() as stack:
        read, write = await stack.enter_async_context(stdio_client(server_params))
        session = await stack.enter_async_context(ClientSession(read, write))
        await session.initialize()
        mcp_session = session

        tool_list = await session.list_tools()
        anthropic_tools = [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.inputSchema,
            }
            for t in tool_list.tools
        ]

        token = os.environ["TELEGRAM_BOT_TOKEN"]
        app = ApplicationBuilder().token(token).build()
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
        print(f"Bot running with {len(anthropic_tools)} tools from rentvine-mcp...")
        async with app:
            await app.start()
            await app.updater.start_polling()
            await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
