import React from 'react';
import WelcomeBar from '../components/dashboard/WelcomeBar';
import AlertStrip from '../components/dashboard/AlertStrip';
import KpiScorecardGrid from '../components/dashboard/KpiScorecardGrid';
import RevenueExpensesChart from '../components/dashboard/RevenueExpensesChart';
import OrderPipelineChart from '../components/dashboard/OrderPipelineChart';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import NeedsAttentionPanel from '../components/dashboard/NeedsAttentionPanel';
import ModuleQuickAccess from '../components/dashboard/ModuleQuickAccess';
import {
  useDashboardKpis,
  useDashboardAlerts,
  useDashboardChartData,
  useDashboardNeedsAttention,
  useActivityFeed,
} from '../hooks/useDashboard';

const Dashboard = () => {
  const { data: kpiData, isLoading: kpiLoading } = useDashboardKpis();
  const { data: alertsData, isLoading: alertsLoading } = useDashboardAlerts();
  const { data: chartData, isLoading: chartLoading } = useDashboardChartData();
  const { data: attentionData, isLoading: attentionLoading } = useDashboardNeedsAttention();
  const { data: activityData, isLoading: activityLoading } = useActivityFeed();

  return (
    <div>
      {/* Welcome header */}
      <WelcomeBar />

      {/* Alert strip */}
      {!alertsLoading && (
        <AlertStrip alerts={alertsData?.alerts} />
      )}

      {/* KPI scorecard row */}
      <KpiScorecardGrid data={kpiData} loading={kpiLoading} />

      {/* Module quick access */}
      <ModuleQuickAccess />

      {/* Charts section — min-w-0 so Recharts can measure grid children */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6 min-w-0">
        <div className="min-w-0">
          <RevenueExpensesChart
            data={chartData?.revenueVsExpenses}
            loading={chartLoading}
          />
        </div>
        <div className="min-w-0">
          <OrderPipelineChart
            data={chartData?.orderPipeline}
            loading={chartLoading}
          />
        </div>
      </div>

      {/* Bottom section: Activity + Needs attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityFeed data={activityData} loading={activityLoading} />
        <NeedsAttentionPanel data={attentionData} loading={attentionLoading} />
      </div>
    </div>
  );
};

export default Dashboard;
