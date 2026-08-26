import { BodyMetric } from '@/data/bodyMetrics';
import { getAllBodyMetricsFromDB, saveBodyMetricToDB, deleteBodyMetricFromDB } from '@/lib/db';
import { useIndexedDBCollection } from './useIndexedDBCollection';

const byDateAscending = (metrics: BodyMetric[]) =>
  [...metrics].sort((a, b) => a.date.localeCompare(b.date));

export const useBodyMetrics = () => {
  const { items, isLoading, error, load, create, update, remove } =
    useIndexedDBCollection<BodyMetric>({
      getAll: getAllBodyMetricsFromDB,
      save: saveBodyMetricToDB,
      remove: deleteBodyMetricFromDB,
      errorMessage: 'Failed to load body weight history',
      transform: byDateAscending
    });

  return {
    bodyMetrics: items,
    isLoading,
    error,
    createBodyMetric: create,
    updateBodyMetric: update,
    deleteBodyMetric: remove,
    refreshBodyMetrics: load
  };
};
