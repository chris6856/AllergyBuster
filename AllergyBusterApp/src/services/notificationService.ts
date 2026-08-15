import notifee, {
  AlarmType,
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
} from '@notifee/react-native';
import {Platform} from 'react-native';

const CHANNEL_ID = 'allergybuster_reminders';

// 0 = Sunday, 1 = Monday, … 6 = Saturday
const REMINDERS = [
  {
    id: 'reminder_wednesday',
    title: 'Health & Beauty Reminder 💊',
    body: "Need any health or beauty items? AllergyBuster detects allergens in those too — scan before you buy.",
    dayOfWeek: 3,
    hour: 10,
    minute: 0,
  },
  {
    id: 'reminder_friday',
    title: 'Going out tonight? 🍽️',
    body: "AllergyBuster searches restaurants and displays allergen-safe menu items. Stay safe wherever you eat.",
    dayOfWeek: 5,
    hour: 16,
    minute: 0,
  },
  {
    id: 'reminder_saturday',
    title: 'Grocery shopping this weekend? 🛒',
    body: "Remember — AllergyBuster is always with you to scan barcodes and read ingredient labels in the aisle.",
    dayOfWeek: 6,
    hour: 9,
    minute: 0,
  },
];

function nextOccurrence(dayOfWeek: number, hour: number, minute: number): Date {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);

  const daysUntil = (dayOfWeek - now.getDay() + 7) % 7;
  if (daysUntil === 0 && target.getTime() <= now.getTime()) {
    // Same day but the time has already passed — push to next week.
    target.setDate(target.getDate() + 7);
  } else {
    target.setDate(target.getDate() + daysUntil);
  }

  return target;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

export async function scheduleWeeklyReminders(): Promise<void> {
  const settings = await notifee.getNotificationSettings();
  const granted =
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

  if (!granted) {
    return;
  }

  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Weekly Reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }

  for (const r of REMINDERS) {
    await notifee.createTriggerNotification(
      {
        id: r.id,
        title: r.title,
        body: r.body,
        android: {
          channelId: CHANNEL_ID,
          pressAction: {id: 'default'},
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: nextOccurrence(r.dayOfWeek, r.hour, r.minute).getTime(),
        repeatFrequency: RepeatFrequency.WEEKLY,
        alarmManager: {
          // Inexact alarm — no special permission required.
          // Weekly reminders don't need precision beyond ~30 minutes.
          type: AlarmType.SET_AND_ALLOW_WHILE_IDLE,
        },
      },
    );
  }
}
