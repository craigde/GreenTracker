import { format, formatDistanceToNow as fdtn, isBefore, isToday, addDays } from "date-fns";

export const formatDate = (date: Date): string => {
  return format(date, "MMM d, yyyy");
};

export const formatTime = (date: Date): string => {
  return format(date, "h:mm a");
};

export const formatDateTime = (date: Date): string => {
  return format(date, "MMM d, yyyy 'at' h:mm a");
};

export const formatDistanceToNow = (date: Date): string => {
  if (isToday(date)) {
    return "Today";
  }
  return `${fdtn(date, { addSuffix: true })}`;
};

export const daysUntilWatering = (lastWatered: Date, frequencyInDays: number): number => {
  const nextWateringDate = addDays(lastWatered, frequencyInDays);
  const today = new Date();
  const diffInTime = nextWateringDate.getTime() - today.getTime();
  const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));
  return diffInDays;
};

export const isOverdue = (lastWatered: Date, frequencyInDays: number): boolean => {
  const nextWateringDate = addDays(lastWatered, frequencyInDays);
  return isBefore(nextWateringDate, new Date());
};

export const getDueText = (lastWatered: Date, frequencyInDays: number): string => {
  const days = daysUntilWatering(lastWatered, frequencyInDays);
  
  if (isToday(lastWatered)) {
    return "Watered today";
  }
  
  if (days < 0) {
    return `Overdue ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'}`;
  }
  
  if (days === 0) {
    return "Due today";
  }
  
  if (days === 1) {
    return "Due tomorrow";
  }
  
  return `Due in ${days} days`;
};
