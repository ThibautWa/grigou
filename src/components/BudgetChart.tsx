'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MonthlyData {
  month: string;
  income: number;
  outcome: number;
  balance: number;
  cumulative: number;
  predicted_income?: number;
  predicted_outcome?: number;
}

interface BudgetChartProps {
  data: MonthlyData[];
}

export default function BudgetChart({ data }: BudgetChartProps) {
  return (
    <div className="space-y-8">
      {/* Bar Chart for Income vs Outcome */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Revenus vs Dépenses par Mois
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(2)} €`}
            />
            <Legend />
            <Bar dataKey="income" fill="#10b981" name="Revenus" />
            <Bar dataKey="outcome" fill="#ef4444" name="Dépenses" />
            <Bar dataKey="predicted_income" fill="#86efac" name="Revenus prévus" />
            <Bar dataKey="predicted_outcome" fill="#fca5a5" name="Dépenses prévues" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart for Cumulative Balance */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Évolution du Solde Cumulé
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(2)} €`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Solde Cumulé"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
