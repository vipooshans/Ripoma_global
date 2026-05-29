import { useState, useCallback } from 'react';
import { activityService } from '../services/documentService';
import toast from 'react-hot-toast';

export const useDocumentActivity = (docId = null) => {
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchActivity = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = docId
        ? await activityService.getForDocument(docId, { page, limit: 20 })
        : await activityService.getGlobal({ page, limit: 30 });
      setActivities(res.data.activities);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  return { activities, pagination, loading, fetchActivity };
};
