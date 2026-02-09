import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

export const AreaLineChart: React.FC<{ labels: string[]; data: number[]; label?: string }> = ({ labels, data, label = "Tendencia" }) => {
  const chartData = {
    labels,
    datasets: [
      {
        label,
        data,
        fill: true,
        backgroundColor: "rgba(99,102,241,0.12)",
        borderColor: "rgba(99,102,241,1)",
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true },
    },
  } as any;

  return <Line data={chartData} options={options} />;
};

export const CategoryDoughnut: React.FC<{ labels: string[]; values: number[] }> = ({ labels, values }) => {
  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: ["#F59E0B", "#7C3AED", "#EF4444", "#06B6D4"],
        hoverOffset: 8,
      },
    ],
  };

  const options = { responsive: true, plugins: { legend: { position: "bottom" } } } as any;

  return <Doughnut data={data} options={options} />;
};

export const VerticalBar: React.FC<{ labels: string[]; values: number[]; label?: string }> = ({ labels, values, label = "Valores" }) => {
  const data = {
    labels,
    datasets: [
      {
        label,
        data: values,
        backgroundColor: "rgba(16,185,129,0.85)",
        borderRadius: 6,
      },
    ],
  };

  const options = { responsive: true, plugins: { legend: { display: false } } } as any;

  return <Bar data={data} options={options} />;
};

export default {
  AreaLineChart,
  CategoryDoughnut,
  VerticalBar,
};
