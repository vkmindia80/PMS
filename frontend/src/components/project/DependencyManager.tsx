/**
 * Dependency Manager Component
 * 
 * Manages task dependencies with:
 * - Visual dependency editor
 * - Circular dependency detection
 * - Dependency type selection (FS, SS, FF, SF)
 */

import React, { useState } from 'react';
import { DynamicTimelineTask } from '../../services/dynamicTimelineService';
import { Link2, AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface DependencyManagerProps {
  tasks: DynamicTimelineTask[];
  dependencies: any[];
  onDependencyCreate: (dependency: any) => void;
  onDependencyDelete?: (dependencyId: string) => void;
}

const DependencyManager: React.FC<DependencyManagerProps> = ({
  tasks,
  dependencies,
  onDependencyCreate,
  onDependencyDelete
}) => {
  const [showForm, setShowForm] = useState(false);
  const [predecessorId, setPredecessorId] = useState('');
  const [successorId, setSuccessorId] = useState('');
  const [dependencyType, setDependencyType] = useState('FS');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!predecessorId || !successorId) {
      toast.error('Please select both predecessor and successor tasks');
      return;
    }

    if (predecessorId === successorId) {
      toast.error('A task cannot depend on itself');
      return;
    }

    // Check for circular dependencies (simplified)
    const wouldCreateCycle = checkCircularDependency(predecessorId, successorId);
    if (wouldCreateCycle) {
      toast.error('This would create a circular dependency');
      return;
    }

    onDependencyCreate({
      predecessor_id: predecessorId,
      successor_id: successorId,
      dependency_type: dependencyType,
      lag_duration: 0,
      lag_format: 'days'
    });

    setPredecessorId('');
    setSuccessorId('');
    setShowForm(false);
  };

  const checkCircularDependency = (predId: string, succId: string): boolean => {
    // Simplified cycle detection
    const visited = new Set<string>();
    const stack = [succId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === predId) return true;
      if (visited.has(current)) continue;

      visited.add(current);
      const deps = dependencies.filter(d => d.predecessor_id === current);
      deps.forEach(d => stack.push(d.successor_id));
    }

    return false;
  };

  const getTaskName = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.name : 'Unknown Task';
  };

  const getDependencyTypeName = (type: string) => {
    const names: Record<string, string> = {
      'FS': 'Finish-to-Start',
      'SS': 'Start-to-Start',
      'FF': 'Finish-to-Finish',
      'SF': 'Start-to-Finish'
    };
    return names[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Link2 className="h-5 w-5 text-blue-600" />
          <span>Task Dependencies</span>
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="h-4 w-4" />
          <span>Add Dependency</span>
        </button>
      </div>

      {/* Add Dependency Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Predecessor (Before)
                </label>
                <select
                  value={predecessorId}
                  onChange={(e) => setPredecessorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select predecessor task</option>
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Successor (After)
                </label>
                <select
                  value={successorId}
                  onChange={(e) => setSuccessorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select successor task</option>
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dependency Type
              </label>
              <select
                value={dependencyType}
                onChange={(e) => setDependencyType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="FS">Finish-to-Start (FS)</option>
                <option value="SS">Start-to-Start (SS)</option>
                <option value="FF">Finish-to-Finish (FF)</option>
                <option value="SF">Start-to-Finish (SF)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {dependencyType === 'FS' && 'Successor starts after predecessor finishes (most common)'}
                {dependencyType === 'SS' && 'Successor starts when predecessor starts'}
                {dependencyType === 'FF' && 'Successor finishes when predecessor finishes'}
                {dependencyType === 'SF' && 'Successor finishes when predecessor starts'}
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Dependency
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dependencies List */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {dependencies.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Link2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p>No dependencies defined</p>
            <p className="text-sm mt-1">Add dependencies to link tasks together</p>
          </div>
        ) : (
          dependencies.map((dep, index) => (
            <div key={index} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium text-gray-900">
                      {getTaskName(dep.predecessor_id)}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                      {getDependencyTypeName(dep.dependency_type)}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-gray-900">
                      {getTaskName(dep.successor_id)}
                    </span>
                  </div>
                  {dep.conflict_detected && (
                    <div className="flex items-center space-x-1 text-xs text-red-600 mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Conflict detected</span>
                    </div>
                  )}
                </div>
                {onDependencyDelete && (
                  <button
                    onClick={() => onDependencyDelete(dep.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DependencyManager;