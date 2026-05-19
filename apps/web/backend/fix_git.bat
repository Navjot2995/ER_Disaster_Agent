@echo off
echo ========================================================
echo FIXING GIT REPOSITORY LOCATION AND PUSHING TO GITHUB
echo ========================================================

echo 1. Deleting the broken git repo in the backend folder...
rmdir /s /q "G:\Disaster agent 1\er-gemma-vision\apps\web\backend\.git"

echo 2. Moving to the correct project root directory...
cd /d "G:\Disaster agent 1\er-gemma-vision"

echo 3. Initializing fresh Git repository...
git init

echo 4. Adding all files (respecting .gitignore)...
git add .

echo 5. Committing files...
git commit -m "Initial commit: ER Gemma Vision Hackathon Submission"

echo 6. Renaming branch to main...
git branch -M main

echo 7. Linking to GitHub...
git remote add origin https://github.com/Navjot2995/ER_Disaster_Agent.git

echo 8. Force Pushing to GitHub...
git push -u origin main -f

echo ========================================================
echo DONE! Check your GitHub repository to confirm the upload.
echo ========================================================
pause
