#!/bin/bash
echo "Starting ER Gemma Vision Dev Environment"
cd apps/web/backend && uvicorn main:app --reload &
cd apps/web/frontend && npm run dev\n