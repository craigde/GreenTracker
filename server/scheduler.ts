import { storage } from './storage';
import { checkPlantsAndSendNotifications, sendPushoverNotification } from './notifications';

// Time in milliseconds
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

// Default check time - 8:00 AM
const DEFAULT_CHECK_HOUR = 8;
const DEFAULT_CHECK_MINUTE = 0;

let lastCheckDate: Date | null = null;
let schedulerInterval: NodeJS.Timeout | null = null;

// Format date to a simple string for comparison
function getDateString(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// Check if today's check has already been done
function hasCheckedToday(): boolean {
  if (!lastCheckDate) return false;
  const today = getDateString(new Date());
  const lastCheck = getDateString(lastCheckDate);
  return today === lastCheck;
}

// Determine if it's time to check (8:00 AM by default)
function isCheckTime(): boolean {
  const now = new Date();
  return now.getHours() === DEFAULT_CHECK_HOUR && 
         now.getMinutes() >= DEFAULT_CHECK_MINUTE && 
         now.getMinutes() < DEFAULT_CHECK_MINUTE + 5; // 5 minute window
}

// Check plants and send notifications if needed
async function checkPlantsTask() {
  console.log('Running plant check task...');
  
  if (hasCheckedToday()) {
    console.log('Plants already checked today. Skipping.');
    return;
  }
  
  if (!isCheckTime()) {
    console.log(`Not check time yet. Will check at ${DEFAULT_CHECK_HOUR}:${DEFAULT_CHECK_MINUTE} AM.`);
    return;
  }
  
  try {
    const plants = await storage.getAllPlants();
    console.log(`Checking ${plants.length} plants for watering needs...`);
    
    const notificationsCount = await checkPlantsAndSendNotifications(plants);
    
    console.log(`Daily plant check complete. Sent ${notificationsCount} watering notifications.`);
    
    // Update last check date
    lastCheckDate = new Date();
    
    // Send a summary notification if there are plants that need watering
    if (notificationsCount > 0) {
      await sendPushoverNotification(
        '🪴 PlantDaddy Daily Summary',
        `You have ${notificationsCount} ${notificationsCount === 1 ? 'plant' : 'plants'} that need watering today.`,
        0
      );
    }
  } catch (error) {
    console.error('Error in plant check task:', error);
  }
}

// Start the scheduler
export function startScheduler() {
  console.log('Starting PlantDaddy notification scheduler...');
  
  // Run immediately once
  checkPlantsTask();
  
  // Then set up the interval to run every 15 minutes
  if (!schedulerInterval) {
    schedulerInterval = setInterval(checkPlantsTask, 15 * ONE_MINUTE);
    console.log('Scheduler started. Will check plants every 15 minutes.');
  }
}

// Stop the scheduler
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Plant notification scheduler stopped.');
  }
}