import { useContext } from 'react';
import { NotificationContext } from '../context/NotificationContext';

export const useSocket = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useSocket must be used within a NotificationProvider');
  }
  return context;
};
