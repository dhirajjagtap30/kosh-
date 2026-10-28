@echo off
title Sahyadri Easy Coaching
if not exist node_modules (echo Installing packages, please wait... & call npm install)
echo Starting website... browser will open automatically.
call npm run dev
pause
