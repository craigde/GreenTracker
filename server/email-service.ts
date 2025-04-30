import { MailService } from '@sendgrid/mail';
import { Plant } from '@shared/schema';

// Initialize SendGrid client
const mailService = new MailService();

// This will be set when the API key is provided
let isConfigured = false;

/**
 * Configure the SendGrid email service with an API key
 * @param apiKey SendGrid API key
 */
export function configureEmailService(apiKey: string): void {
  if (!apiKey) {
    console.warn('SendGrid API key not provided, email notifications will not be sent');
    isConfigured = false;
    return;
  }
  
  try {
    mailService.setApiKey(apiKey);
    isConfigured = true;
    console.log('SendGrid email service configured successfully');
  } catch (error) {
    console.error('Failed to configure SendGrid email service:', error);
    isConfigured = false;
  }
}

/**
 * Send a plant watering notification via email
 * @param plant The plant that needs watering
 * @param recipientEmail Email address to send the notification to
 * @returns Promise resolving to true if email was sent, false otherwise
 */
export async function sendPlantWateringEmail(
  plant: Plant,
  recipientEmail: string
): Promise<boolean> {
  if (!isConfigured || !recipientEmail) {
    return false;
  }

  try {
    const message = {
      to: recipientEmail,
      from: 'notifications@plantdaddy.app', // This should be a verified sender in SendGrid
      subject: `🪴 Time to water your ${plant.name}!`,
      text: `Your ${plant.name} needs watering! Log in to PlantDaddy to mark it as watered.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2F855A;">🪴 Time to water your plant!</h2>
          <p style="font-size: 16px; line-height: 1.5;">
            Your <strong>${plant.name}</strong> needs watering!
          </p>
          <p style="font-size: 16px; line-height: 1.5;">
            Location: ${plant.location}
          </p>
          <div style="margin: 30px 0;">
            <a href="https://plantdaddy.app" 
               style="background-color: #2F855A; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Open PlantDaddy
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This notification was sent from PlantDaddy, your plant care companion.
          </p>
        </div>
      `
    };

    await mailService.send(message);
    console.log(`Email notification sent for ${plant.name} to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
}

/**
 * Send a welcome email to a new user
 * @param username The user's username
 * @param recipientEmail Email address to send the welcome message to
 * @returns Promise resolving to true if email was sent, false otherwise
 */
export async function sendWelcomeEmail(
  username: string,
  recipientEmail: string
): Promise<boolean> {
  if (!isConfigured || !recipientEmail) {
    return false;
  }

  try {
    const message = {
      to: recipientEmail,
      from: 'notifications@plantdaddy.app', // This should be a verified sender in SendGrid
      subject: '🪴 Welcome to PlantDaddy!',
      text: `Welcome to PlantDaddy, ${username}! We're excited to help you take care of your plants.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2F855A;">🪴 Welcome to PlantDaddy!</h2>
          <p style="font-size: 16px; line-height: 1.5;">
            Hi <strong>${username}</strong>, we're excited to help you take care of your plants!
          </p>
          <p style="font-size: 16px; line-height: 1.5;">
            With PlantDaddy, you can:
          </p>
          <ul style="font-size: 16px; line-height: 1.5;">
            <li>Track your plants' watering schedules</li>
            <li>Get notifications when plants need attention</li>
            <li>Keep a detailed log of your plant care</li>
            <li>Learn about different plant species</li>
          </ul>
          <div style="margin: 30px 0;">
            <a href="https://plantdaddy.app" 
               style="background-color: #2F855A; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Get Started
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Thank you for choosing PlantDaddy as your plant care companion.
          </p>
        </div>
      `
    };

    await mailService.send(message);
    console.log(`Welcome email sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
}

/**
 * Send a test email to verify the configuration is working
 * @param recipientEmail Email address to send the test message to
 * @returns Promise resolving to true if email was sent, false otherwise
 */
export async function sendTestEmail(recipientEmail: string): Promise<boolean> {
  if (!isConfigured || !recipientEmail) {
    return false;
  }

  try {
    const message = {
      to: recipientEmail,
      from: 'notifications@plantdaddy.app', // This should be a verified sender in SendGrid
      subject: '🪴 PlantDaddy: Test Email',
      text: 'This is a test email from PlantDaddy. If you received this, your email notifications are configured correctly!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2F855A;">🪴 PlantDaddy Test Email</h2>
          <p style="font-size: 16px; line-height: 1.5;">
            This is a test email from PlantDaddy.
          </p>
          <p style="font-size: 16px; line-height: 1.5;">
            If you received this, your email notifications are configured correctly!
          </p>
          <div style="margin: 30px 0;">
            <a href="https://plantdaddy.app" 
               style="background-color: #2F855A; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Open PlantDaddy
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This is a test message from PlantDaddy, your plant care companion.
          </p>
        </div>
      `
    };

    await mailService.send(message);
    console.log(`Test email sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send test email:', error);
    return false;
  }
}