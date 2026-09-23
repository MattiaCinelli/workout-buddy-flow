import { Measurement } from '@/data/measurements';
import { getAllMeasurementsFromDB, saveMeasurementToDB, deleteMeasurementFromDB } from '@/lib/db';
import { useIndexedDBCollection } from './useIndexedDBCollection';

const byDateAscending = (items: Measurement[]) =>
  [...items].sort((a, b) => a.date.localeCompare(b.date));

export const useMeasurements = () => {
  const { items, isLoading, error, load, create, update, remove } =
    useIndexedDBCollection<Measurement>({
      getAll: getAllMeasurementsFromDB,
      save: saveMeasurementToDB,
      remove: deleteMeasurementFromDB,
      errorMessage: 'Failed to load your records',
      transform: byDateAscending
    });

  return {
    measurements: items,
    isLoading,
    error,
    createMeasurement: create,
    updateMeasurement: update,
    deleteMeasurement: remove,
    refreshMeasurements: load
  };
};
