"""Rentvine Telegram bot — uses rentvine-mcp client + Claude to answer PM questions."""
import asyncio
import os

from anthropic import Anthropic
from dotenv import load_dotenv
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters

from rentvine_mcp import client as rv

load_dotenv()

anthropic = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

SYSTEM_PROMPT = """You are a property management assistant with live access to Rentvine data.
Answer questions about properties, leases, tenants, work orders, applications, and inspections.
Be concise — this is a Telegram chat. Use plain text, no markdown."""

TOOLS = [
    {
        "name": "list_properties",
        "description": "List all properties with address, type, and active status.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "list_leases",
        "description": "List all leases with tenant name, unit address, rent, deposit, bed/bath count, dates, and status.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "list_units",
        "description": "List units for a specific property with vacancy status and rent.",
        "input_schema": {
            "type": "object",
            "properties": {
                "property_name": {
                    "type": "string",
                    "description": "Property name or address fragment.",
                }
            },
            "required": ["property_name"],
        },
    },
    {
        "name": "list_work_orders",
        "description": "List all maintenance work orders with description, status, priority, and vendor.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "list_applications",
        "description": "List rental applications with applicant name, property, and status.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "list_inspections",
        "description": "List maintenance inspections with scheduled date and inspector.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_tenant_balance",
        "description": "Get ledger balance for a tenant by name.",
        "input_schema": {
            "type": "object",
            "properties": {
                "tenant_name": {
                    "type": "string",
                    "description": "Tenant full name.",
                }
            },
            "required": ["tenant_name"],
        },
    },
]


async def run_tool(name: str, inputs: dict):
    if name == "list_properties":
        return await rv.fetch_properties()
    if name == "list_leases":
        return await rv.fetch_leases()
    if name == "list_units":
        props = await rv.fetch_properties()
        prop = next(
            (p for p in props if inputs["property_name"].lower() in (p.get("name") or p.get("address") or "").lower()),
            None,
        )
        if not prop:
            return {"error": f"Property '{inputs['property_name']}' not found."}
        return await rv.fetch_units(str(prop.get("propertyID")))
    if name == "list_work_orders":
        return await rv.fetch_work_orders()
    if name == "list_applications":
        return await rv.fetch_applications()
    if name == "list_inspections":
        return await rv.fetch_inspections()
    if name == "get_tenant_balance":
        tenants = await rv.fetch_tenants()
        tenant = next(
            (t for t in tenants if inputs["tenant_name"].lower() in (t.get("name") or "").lower()),
            None,
        )
        if not tenant:
            return {"error": f"Tenant '{inputs['tenant_name']}' not found."}
        return await rv.fetch_tenant_balance(str(tenant.get("tenantID")))
    return {"error": f"Unknown tool: {name}"}


async def ask_claude(user_message: str) -> str:
    messages = [{"role": "user", "content": user_message}]

    while True:
        response = anthropic.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            return next(
                (block.text for block in response.content if hasattr(block, "text")),
                "No response.",
            )

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = await run_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": str(result),
                    })
            messages.append({"role": "user", "content": tool_results})
        else:
            break

    return "Something went wrong."


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.effective_chat.send_action(ChatAction.TYPING)
    reply = await ask_claude(update.message.text)
    await update.message.reply_text(reply)


async def main():
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    app = ApplicationBuilder().token(token).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    print("Bot running...")
    async with app:
        await app.start()
        await app.updater.start_polling()
        await asyncio.Event().wait()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
