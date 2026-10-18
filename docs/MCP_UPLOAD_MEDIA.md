# Legacy Base64 upload (removed)

The owner-only MCP `upload_media` tool that accepted Base64 image strings was removed after `upload_chatgpt_image` became available. The Site must be redeployed separately to refresh the advertised MCP tool set (12 tools).

Use `upload_chatgpt_image` for ChatGPT-generated or attached images, `import_media_from_url` for approved HTTPS sources, or the authenticated owner Web editor for local files. None of these paths requires sending Base64 in MCP JSON arguments.

This is historical documentation. Existing D1 and R2 media remain unchanged by removing the obsolete tool.
