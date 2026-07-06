// HUMBLE Web Application - Initial Data & Resources

const HumbleData = {
  // Initial stories to populate the feed
  stories: [
    {
      id: 'story_1',
      username: 'Anonymous',
      avatarColor: '#C95920',
      title: 'Grieving in Silence',
      content: 'Losing my grandmother last month was the hardest thing I\'ve faced. In our culture, sometimes you are expected to just stay strong and move on, but the silence in the house is deafening. Writing this is my way of venting because keeping it all inside is starting to weigh heavily on me.',
      category: 'Grief',
      anchors: 14,
      comments: [
        {
          username: 'Amani_Hope',
          content: 'I feel you, friend. Grief has no timeline. Take all the time you need, and don\'t feel pressured to "just get over it."',
          createdAt: '2026-06-25T14:30:00Z'
        }
      ],
      createdAt: '2026-06-25T10:15:00Z'
    },
    {
      id: 'story_2',
      username: 'Kamau_K',
      avatarColor: '#4A5C2A',
      title: 'The Weight of Expectations',
      content: 'Being the firstborn in a Kenyan family comes with a massive silent load. Everyone expects you to succeed, send money home, and have everything figured out. I\'m currently jobless and the anxiety of job seeking while managing expectations is exhausting. Just need a place to say I am not okay today.',
      category: 'Family Pressure',
      anchors: 28,
      comments: [
        {
          username: 'Anonymous',
          content: 'You are not alone in this. The black tax and firstborn expectations are real in our society. Breathe, your worth isn\'t tied only to financial success.',
          createdAt: '2026-06-26T08:12:00Z'
        }
      ],
      createdAt: '2026-06-26T02:30:00Z'
    },
    {
      id: 'story_3',
      username: 'Wanjiku_W',
      avatarColor: '#2B7EC1',
      title: '50 Applications and Counting',
      content: '50 applications sent this month and not a single interview call. The job search fatigue is real. It\'s easy to feel worthless when the system doesn\'t respond. Just venting my frustration because it\'s eating me up inside. How do you guys stay motivated in this economy?',
      category: 'Anxiety',
      anchors: 9,
      comments: [],
      createdAt: '2026-06-26T09:45:00Z'
    },
    {
      id: 'story_4',
      username: 'Amani_Hope',
      avatarColor: '#4A5C2A',
      title: 'Finding Light in Nakuru',
      content: 'After battling severe depression last year, I finally mustered the courage to reach out to a peer support group here in Nakuru. It felt extremely weird sharing my thoughts with strangers at first, but hearing their struggles made me realize I wasn\'t alone. It was the first step to my healing.',
      category: 'Coping',
      anchors: 35,
      comments: [
        {
          username: 'Kamau_K',
          content: 'This is inspiring! Thank you for sharing your light. It gives me hope.',
          createdAt: '2026-06-26T05:00:00Z'
        }
      ],
      createdAt: '2026-06-25T18:20:00Z'
    }
  ],

  // Kenyan Helpline Directory
  helplines: [
    {
      name: 'Befrienders Kenya',
      phone: '+254 722 178 177',
      email: 'info@befrienderskenya.org',
      availability: '24 Hours / 7 Days',
      type: 'Suicide Prevention & Emotional Distress Helpline',
      description: 'A charitable organization offering free emotional support to those who are lonely, in distress, or struggling with suicidal thoughts.'
    },
    {
      name: 'Niskize',
      phone: '+254 900 620 800',
      email: 'support@niskize.co.ke',
      availability: '24 Hours / 7 Days',
      type: 'Professional Tele-Counseling Service',
      description: 'A 24-hour helpline offering psychological support, therapy, crisis intervention, and professional counselling.'
    },
    {
      name: 'Kenya Red Cross Helpline',
      phone: '1199',
      availability: '24 Hours / 7 Days',
      type: 'Toll-Free Emergency Helpline',
      description: 'A toll-free helpline providing tele-counselling, psychological first aid, and emergency medical response coordination.'
    },
    {
      name: 'Oasis Africa',
      phone: '+254 725 366 614',
      email: 'info@oasisafrica.co.ke',
      availability: 'Mon - Sat: 8:00 AM - 5:00 PM',
      type: 'Psychotherapy & Counseling Clinic',
      description: 'A leading psychological counselling and training center offering clinical psychologists for therapy and family consultation.'
    }
  ],

  // Mood Assessment Quiz
  quiz: {
    title: 'Mental Health Screening',
    description: 'This is a scientifically inspired self-assessment based on standard clinical screening indicators (like PHQ-9 and GAD-7). It is designed to evaluate stress, anxiety, and depression risk. It does not replace a professional diagnosis but helps you reflect on your emotional well-being.',
    questions: [
      {
        id: 'q1',
        text: 'Little interest or pleasure in doing things over the last 2 weeks?'
      },
      {
        id: 'q2',
        text: 'Feeling down, depressed, or hopeless over the last 2 weeks?'
      },
      {
        id: 'q3',
        text: 'Trouble falling or staying asleep, or sleeping too much?'
      },
      {
        id: 'q4',
        text: 'Feeling tired or having little energy?'
      },
      {
        id: 'q5',
        text: 'Poor appetite or overeating?'
      },
      {
        id: 'q6',
        text: 'Feeling bad about yourself, or that you are a failure or have let yourself or your family down?'
      },
      {
        id: 'q7',
        text: 'Trouble concentrating on things, such as reading the news, working, or studying?'
      },
      {
        id: 'q8',
        text: 'Feeling nervous, anxious, or on edge?'
      },
      {
        id: 'q9',
        text: 'Not being able to stop or control worrying?'
      }
    ],
    options: [
      { text: 'Not at all', value: 0 },
      { text: 'Several days', value: 1 },
      { text: 'More than half the days', value: 2 },
      { text: 'Nearly every day', value: 3 }
    ],
    recommendations: [
      {
        min: 0,
        max: 5,
        level: 'Minimal or No Risk',
        class: 'level-minimal',
        message: 'You seem to be in a stable emotional space. You are experiencing minimal distress. Continue practicing healthy habits, getting enough rest, and staying connected with your community!',
        action: 'Explore our stories feed or keep a private daily journal to maintain your positive mindset.'
      },
      {
        min: 6,
        max: 12,
        level: 'Mild Risk',
        class: 'level-mild',
        message: 'You are experiencing some mild signs of stress, anxiety, or low mood. These are common and manageable.',
        action: 'We recommend writing down your thoughts in the Private Journal to track emotional triggers, sharing an anonymous vent on our community feed, and engaging in light exercise or mindfulness.'
      },
      {
        min: 13,
        max: 19,
        level: 'Moderate Risk',
        class: 'level-moderate',
        message: 'You are experiencing a moderate level of emotional distress. Please don\'t ignore this. Your feelings are valid, and it is a good time to reach out.',
        action: 'We suggest checking our Local Resources Directory to talk to a peer counselor or speaking to a trusted friend or family member about what you are going through.'
      },
      {
        min: 20,
        max: 27,
        level: 'Severe Risk',
        class: 'level-severe',
        message: 'You are experiencing significant distress and emotional pain. Please know that you do not have to carry this heavy burden alone, and support is available.',
        action: 'We strongly advise you to contact one of our local Kenyan toll-free support helplines (like Kenya Red Cross at 1199 or Befrienders Kenya at +254 722 178 177) or seek professional guidance immediately. Seeking help is a profound act of courage.'
      }
    ]
  }
};
