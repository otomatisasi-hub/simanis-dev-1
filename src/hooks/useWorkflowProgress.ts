import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface WorkflowProgress {
  currentStepOrder: number;
  currentStepId: string | null;
  isAllStepsCompleted: boolean;
}

export function useWorkflowProgress(serviceId: string, workflowSteps?: any[]) {
  const [progress, setProgress] = useState<WorkflowProgress>({
    currentStepOrder: 1,
    currentStepId: null,
    isAllStepsCompleted: false
  });
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  // Calculate current step from local steps data
  const calculateCurrentStepFromSteps = useCallback((steps: any[]) => {
    if (!steps || steps.length === 0) return null;

    // 1. Cari step 'in-progress'
    const inProgressStep = steps.find(s => s.status === 'in-progress');
    if (inProgressStep) {
      return {
        stepOrder: inProgressStep.step_order,
        stepId: inProgressStep.id,
        status: inProgressStep.status
      };
    }

    // 2. Cari step 'pending' pertama
    const firstPending = steps.find(s => s.status === 'pending');
    if (firstPending) {
      return {
        stepOrder: firstPending.step_order,
        stepId: firstPending.id,
        status: firstPending.status
      };
    }

    // 3. Semua completed, ambil step terakhir
    const completedSteps = steps.filter(s => s.status === 'completed');
    if (completedSteps.length === steps.length) {
      const lastStep = steps[steps.length - 1];
      return {
        stepOrder: lastStep.step_order,
        stepId: lastStep.id,
        status: 'completed',
        allCompleted: true
      };
    }

    // 4. Fallback ke step pertama
    return {
      stepOrder: steps[0].step_order,
      stepId: steps[0].id,
      status: steps[0].status
    };
  }, []);

  // Fetch current step dari server
  const fetchCurrentStep = useCallback(async () => {
    if (!serviceId) return;

    try {
      setLoading(true);
      
      console.log('🔍 Fetching current step for service:', serviceId);
      
      const response = await fetch(`${API_URL}/api/workflow/${serviceId}/current-step`);
      const result = await response.json();

      if (!isMounted.current) return;

      if (result.success && result.data) {
        console.log('✅ Current step from server:', result.data);
        
        setProgress({
          currentStepOrder: result.stepOrder,
          currentStepId: result.data.id,
          isAllStepsCompleted: result.data.status === 'completed'
        });

        // Save ke localStorage
        localStorage.setItem(
          `workflow_progress_${serviceId}`,
          JSON.stringify({
            stepOrder: result.stepOrder,
            stepId: result.data.id,
            status: result.data.status,
            timestamp: Date.now()
          })
        );
      } else {
        console.warn('⚠️ No current step from server, using local calculation');
      }
    } catch (error) {
      console.error('❌ Error fetching current step:', error);

      // Fallback ke localStorage
      const cached = localStorage.getItem(`workflow_progress_${serviceId}`);
      if (cached) {
        const data = JSON.parse(cached);
        console.log('📦 Using cached progress:', data);
        
        if (isMounted.current) {
          setProgress({
            currentStepOrder: data.stepOrder,
            currentStepId: data.stepId,
            isAllStepsCompleted: data.status === 'completed'
          });
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [serviceId]);

  // Calculate from local workflow steps (faster)
  useEffect(() => {
    if (workflowSteps && workflowSteps.length > 0) {
      const calculated = calculateCurrentStepFromSteps(workflowSteps);
      
      if (calculated) {
        console.log('📊 Calculated current step from local data:', calculated);
        
        setProgress({
          currentStepOrder: calculated.stepOrder,
          currentStepId: calculated.stepId,
          isAllStepsCompleted: calculated.allCompleted || false
        });

        // Update localStorage
        localStorage.setItem(
          `workflow_progress_${serviceId}`,
          JSON.stringify({
            stepOrder: calculated.stepOrder,
            stepId: calculated.stepId,
            status: calculated.status,
            timestamp: Date.now()
          })
        );
      }
    }
  }, [workflowSteps, serviceId, calculateCurrentStepFromSteps]);

  // Save progress ke server
  const saveProgress = useCallback(async (stepId: string) => {
    try {
      const userId = localStorage.getItem('userId') || '';
      
      await fetch(`${API_URL}/api/workflow/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId,
          currentStepId: stepId,
          userId
        })
      });
      
      console.log('💾 Progress saved to server');
    } catch (error) {
      console.error('❌ Error saving progress:', error);
    }
  }, [serviceId]);

  // Auto-save progress setiap 30 detik
  useEffect(() => {
    if (!progress.currentStepId) return;

    const interval = setInterval(() => {
      saveProgress(progress.currentStepId!);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [progress.currentStepId, saveProgress]);

  // Fetch dari server saat mount (as backup)
  useEffect(() => {
    isMounted.current = true;
    
    // Delay fetch untuk memberi kesempatan local calculation dulu
    const timer = setTimeout(() => {
      fetchCurrentStep();
    }, 500);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, [fetchCurrentStep]);

  return {
    progress,
    loading,
    refetch: fetchCurrentStep,
    saveProgress
  };
}
