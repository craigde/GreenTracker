import fetch from 'node-fetch';
import { Plant } from '@shared/schema';
import { daysUntilWatering, isOverdue } from '../client/src/lib/date-utils';
import { storage } from './storage';
import { 
  configureEmailService, 
  sendPlantWateringEmail, 
  sendWelcomeEmail, 
  sendTestEmail 
} from './email-service';

// Pushover API endpoint
const PUSHOVER_API_URL = 'https://api.pushover.net/1/messages.json';

// Load environment variables as fallbacks
const ENV_PUSHOVER_APP_TOKEN = process.env.PUSHOVER_APP_TOKEN;
const ENV_PUSHOVER_USER_KEY = process.env.PUSHOVER_USER_KEY;

export async function sendPushoverNotification(
  title: string,
  message: string,
  priority: number = 0,
  url?: string,
  urlTitle?: string
): Promise<boolean> {
  // Get notification settings from storage
  const settings = await storage.getNotificationSettings();
  
  // Use settings if available, otherwise fallback to environment variables
  const pushoverEnabled = settings?.enabled !== false; // Default to true if not set
  const pushoverAppToken = settings?.pushoverAppToken || ENV_PUSHOVER_APP_TOKEN;
  const pushoverUserKey = settings?.pushoverUserKey || ENV_PUSHOVER_USER_KEY;
  
  // Debug: Print token length and first/last characters (partial for security)
  if (pushoverAppToken) {
    console.log(`PUSHOVER_APP_TOKEN: ${pushoverAppToken.substr(0, 3)}...${pushoverAppToken.substr(-3)} (${pushoverAppToken.length} chars)`);
  }
  
  if (pushoverUserKey) {
    console.log(`PUSHOVER_USER_KEY: ${pushoverUserKey.substr(0, 3)}...${pushoverUserKey.substr(-3)} (${pushoverUserKey.length} chars)`);
  }
  
  // If notifications are disabled or credentials are missing, don't send notification
  if (!pushoverEnabled) {
    console.log('Notifications are disabled in settings. Skipping notification.');
    return false;
  }
  
  if (!pushoverAppToken || !pushoverUserKey) {
    console.warn('Cannot send notification: Pushover credentials missing');
    return false;
  }

  try {
    const payload = {
      token: pushoverAppToken,
      user: pushoverUserKey,
      title,
      message,
      priority,
      ...(url && { url }),
      ...(urlTitle && { url_title: urlTitle })
    };

    // Debug the request we're about to make (without showing full token/key)
    console.log(`Sending notification to Pushover: "${title}"`);
    
    const response = await fetch(PUSHOVER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as any;
    
    if (response.ok && data.status === 1) {
      console.log(`Notification sent successfully: ${title}`);
      return true;
    } else {
      console.error('Failed to send notification:', data);
      return false;
    }
  } catch (error) {
    console.error('Error sending Pushover notification:', error);
    return false;
  }
}

export async function sendPlantWateringNotification(plant: Plant): Promise<boolean> {
  const daysOverdue = -daysUntilWatering(plant.lastWatered, plant.wateringFrequency);
  const isUrgent = daysOverdue > 2;
  
  const title = `🪴 PlantDaddy: ${plant.name} needs water!`;
  const message = isUrgent 
    ? `Your ${plant.name} in ${plant.location} is ${daysOverdue} days overdue for watering!` 
    : `Time to water your ${plant.name} in ${plant.location}`;
  
  // Use higher priority (1) for urgent notifications
  const priority = isUrgent ? 1 : 0;
  
  return sendPushoverNotification(title, message, priority);
}

export async function sendWelcomeNotification(): Promise<boolean> {
  const title = '🪴 Welcome to PlantDaddy!';
  const message = 'Your plant watering notifications are now set up. You\'ll receive alerts when your plants need water.';
  
  return sendPushoverNotification(title, message, 0);
}

export async function checkPlantsAndSendNotifications(plants: Plant[]): Promise<number> {
  let notificationsSent = 0;
  
  for (const plant of plants) {
    if (isOverdue(plant.lastWatered, plant.wateringFrequency)) {
      const sent = await sendPlantWateringNotification(plant);
      if (sent) notificationsSent++;
    }
  }
  
  return notificationsSent;
}