REM THIS FILE IS THE WAY TO CALL THE NPM START FROM LOCAL AND SET THE ENV VARIABLES LIKE 
REM CONNECTION STRING TO AVOID ANY ACCIDENTAL CHECKINS OF CONN STRINGS
@echo off 
setlocal
REM set MONGODB_URI=dbconnstring
npm run start
endlocal