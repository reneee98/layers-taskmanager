const { exec } = require('child_process');
const path = require('path');

const projectPath = '/Users/renemoravec/Library/CloudStorage/GoogleDrive-renkomoravec@gmail.com/My Drive/Robota/Wohoo/Layers/Layers/layers-studio';

console.log('🚀 Pushing changes to Vercel...');

// Git add
exec('git add .', { cwd: projectPath }, (error, stdout, stderr) => {
  if (error) {
    console.error('Error adding files:', error);
    return;
  }
  console.log('✅ Files added to git');

  // Git commit
  exec('git commit -m "UI improvements: dashboard table format, status badges, sidebar cleanup"', { cwd: projectPath }, (error, stdout, stderr) => {
    if (error) {
      console.error('Error committing:', error);
      return;
    }
    console.log('✅ Changes committed');

    // Git push
    exec('git push origin main', { cwd: projectPath }, (error, stdout, stderr) => {
      if (error) {
        console.error('Error pushing:', error);
        return;
      }
      console.log('✅ Changes pushed to Vercel!');
      console.log('🎯 Deployment should start automatically...');
    });
  });
});

