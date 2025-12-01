import React from 'react';

interface HUDProgressProps {
  scrollProgress: number;
  activePhase: number;
  sectionName: string;
}

export const HUDProgress: React.FC<HUDProgressProps> = ({ 
  scrollProgress, 
  activePhase,
  sectionName 
}) => {
  const milestones = [
    { position: 0, label: 'START', sublabel: 'Intro Phase', range: [0, 14] },
    { position: 15, label: 'VELOCITY', sublabel: 'Real-Time Tracking', range: [15, 34] },
    { position: 35, label: 'SENSOR HEAD', sublabel: 'Fuel Detection', range: [35, 49] },
    { position: 50, label: 'SEQ 2 START', sublabel: 'Second Sequence', range: [50, 64] },
    { position: 65, label: 'VELOCITY', sublabel: 'Performance Data', range: [65, 84] },
    { position: 85, label: 'SENSOR HEAD', sublabel: 'Component Details', range: [85, 99] },
    { position: 100, label: 'COMPLETE', sublabel: 'Journey End', range: [100, 100] }
  ];

  return (
    <div className="hud-progress">
      {/* Vertical Progress Bar */}
      <div className="hud-progress-bar">
        <div 
          className="hud-progress-fill"
          style={{ height: `${scrollProgress}%` }}
        />
        {/* Progress Markers with Text Labels */}
        {milestones.map((milestone, index) => {
          const isInRange = scrollProgress >= milestone.range[0] && scrollProgress <= milestone.range[1];
          const isPassed = scrollProgress >= milestone.position;
          
          return (
            <div 
              key={index}
              className={`hud-marker ${isPassed ? 'active' : ''} ${isInRange ? 'current' : ''}`}
              style={{ top: `${milestone.position}%` }}
            >
              <div className="hud-marker-text">
                <div className="hud-marker-label">{scrollProgress}% {milestone.label}</div>
                <div className="hud-marker-sublabel">{milestone.sublabel}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
