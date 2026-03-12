(function () {
  const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const schedule = {
    Monday: { primary: 'Client Builds', primaryWindow: '06:00-09:00', secondary: 'Planning and Client Communication', secondaryWindow: '16:00-19:00', secondStart: 16, secondEnd: 19, theme: 'Build and plan', tasks: ['Build the highest-value page or feature.', 'Check accessibility and mobile basics.', 'Reply to open client threads.', 'Tighten the week plan.'], prep: ['Choose the most commercially important build first.', 'List all open client replies.', 'Decide what visible progress matters most.'] },
    Tuesday: { primary: 'Client Project Work', primaryWindow: '06:00-09:00', secondary: 'Outreach and Business Development', secondaryWindow: '15:00-18:00', secondStart: 15, secondEnd: 18, theme: 'Project progress and outreach', tasks: ['Implement live project changes.', 'Handle hosting or forms.', 'Send practical outreach messages.', 'Follow up warm leads.'], prep: ['Prepare one proof piece worth sending.', 'Keep one clear offer ready.', 'Do not leave warm leads without a next action.'] },
    Wednesday: { primary: 'Technical Development', primaryWindow: '06:00-09:00', secondary: 'Maintenance and Reliability Checks', secondaryWindow: '12:00-15:00', secondStart: 12, secondEnd: 15, theme: 'Technical stability', tasks: ['Improve reusable components.', 'Check backups and uptime.', 'Review forms, links, and speed.', 'Check domains and certificates.'], prep: ['Choose one technical friction to remove.', 'Note what can become a maintenance standard.', 'Keep recurring service ideas visible.'] },
    Thursday: { primary: 'Systems and Documentation', primaryWindow: '06:00-09:00', secondary: 'Governance and Finance', secondaryWindow: '15:00-18:00', secondStart: 15, secondEnd: 18, theme: 'Systems and control', tasks: ['Improve SOPs and templates.', 'Update income and expense records.', 'Review subscriptions and admin.', 'Capture business decisions.'], prep: ['Pick the one system to simplify.', 'Make finance updates while details are fresh.', 'Decide what procedure should be written next.'] },
    Friday: { primary: 'Client Delivery Work', primaryWindow: '06:00-09:00', secondary: 'Visibility and Publishing', secondaryWindow: '12:00-15:00', secondStart: 12, secondEnd: 15, theme: 'Delivery and visibility', tasks: ['Finalise build work and QA.', 'Prepare launch or handover.', 'Publish one trust-building proof piece.', 'Refresh a portfolio or article asset.'], prep: ['Choose what can be finished and shown.', 'Publish proof of competence.', 'Leave fewer loose ends for next week.'] },
    Saturday: { primary: 'Learning and Skill Development', primaryWindow: '06:00-09:00', secondary: 'Weekly Review and Preparation', secondaryWindow: '15:00-18:00', secondStart: 15, secondEnd: 18, theme: 'Learning and review', tasks: ['Study a service-relevant skill.', 'Review business objectives.', 'Tidy loose files and notes.', 'Prepare next week.'], prep: ['Choose one capability gap.', 'Translate learning into a business improvement.', 'Enter Sunday with a lighter next week.'] },
    Sunday: { primary: 'Rest', primaryWindow: 'Day of rest', secondary: 'Rest', secondaryWindow: 'Day of rest', secondStart: 0, secondEnd: 0, theme: 'Mass, rest, and recovery', tasks: ['Mass and prayer.', 'Family life and rest.', 'No business activity unless genuinely urgent.'], prep: ['Let the day recover you.', 'Keep Monday visible without working all day.', 'A calm Sunday is part of discipline.'] }
  };

  function dayName(date) {
    return date.toLocaleDateString('en-GB', { weekday: 'long' });
  }

  function tomorrow(date) {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return next;
  }

  function getBlock(name, hours, minutes) {
    const day = schedule[name];
    if (!day) return { current: '-', next: '-' };
    if (name === 'Sunday') return { current: 'Rest day', next: 'Monday - Client Builds (06:00-09:00)' };
    const now = hours * 60 + minutes;
    if (now >= 360 && now < 540) return { current: `${day.primary} (${day.primaryWindow})`, next: `${day.secondary} (${day.secondaryWindow})` };
    if (now >= day.secondStart * 60 && now < day.secondEnd * 60) return { current: `${day.secondary} (${day.secondaryWindow})`, next: 'End of working blocks' };
    if (now < 360) return { current: 'Before work blocks', next: `${day.primary} (${day.primaryWindow})` };
    if (now >= 540 && now < day.secondStart * 60) return { current: 'Between blocks', next: `${day.secondary} (${day.secondaryWindow})` };
    const nextName = dayName(tomorrow(new Date()));
    return { current: 'After work blocks', next: nextName === 'Sunday' ? 'Sunday - Rest day' : `${nextName} - ${schedule[nextName].primary} (${schedule[nextName].primaryWindow})` };
  }

  function getCalendarRows() {
    return order.map(function (name) {
      return {
        day: name,
        primary: `${schedule[name].primary}${name === 'Sunday' ? '' : ' (' + schedule[name].primaryWindow + ')'}`,
        secondary: name === 'Sunday' ? 'Rest' : `${schedule[name].secondary} (${schedule[name].secondaryWindow})`,
        theme: schedule[name].theme,
        prep: schedule[name].prep.join(' ')
      };
    });
  }

  window.PlaytrixGovernance = {
    order: order,
    schedule: schedule,
    dayName: dayName,
    tomorrow: tomorrow,
    getBlock: getBlock,
    getCalendarRows: getCalendarRows
  };
})();
