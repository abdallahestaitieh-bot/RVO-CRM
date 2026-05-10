const { v4: uuidv4 } = require('uuid');

const db = { deals:[], contacts:[], activities:[], clients:[], onboarding_items:[] };

function seedData() {
  const deals = [
    ['Horizon Tech','Sara Al-Rashid',18000,'Lead Generation',3,-2],
    ['Gulf Ventures','Khalid Mansour',35000,'Inquiry',1,-4],
    ['AlMasraf Group','Fatima Nasser',52000,'Qualification',5,-1],
    ['NovaBridge LLC','James Harrington',28000,'Strategy Call',-1,-8],
    ['Cedar Digital','Rami Khoury',75000,'Proposal',2,-3],
    ['Emirates Scale','Aisha Haddad',120000,'Close',1,-1],
    ['Pulse Media','Tom Ellsworth',22000,'Onboarding',4,-5],
    ['Vertex Partners','Dana Aziz',48000,'Retention',7,-2],
    ['Synapse Growth','Omar Sheikh',95000,'Upsell & Referral',3,-1],
  ];
  deals.forEach(([company,contact,value,stage,dd,ad]) => {
    const due=new Date(); due.setDate(due.getDate()+dd);
    const act=new Date(); act.setDate(act.getDate()+ad);
    db.deals.push({id:uuidv4(),company_name:company,contact_name:contact,deal_value:value,stage,next_action_date:due.toISOString().split('T')[0],last_activity_date:act.toISOString(),notes:'',assigned_to:'Abdallah',created_at:new Date().toISOString()});
  });
  const contacts = [
    ['Sara Al-Rashid','Horizon Tech','sara@horizontech.com','+971 50 123 4567','LinkedIn','Qualified',-2],
    ['Khalid Mansour','Gulf Ventures','k.mansour@gulfventures.ae','+971 55 987 6543','Referral','New',2],
    ['Rami Khoury','Cedar Digital','rami@cedardigital.lb','+961 3 456 789','Conference','Proposal Sent',1],
    ['Dana Aziz','Vertex Partners','dana@vertexpartners.com','+971 52 654 3210','Website','Client',7],
  ];
  contacts.forEach(([name,company,email,phone,source,status,fd]) => {
    const fu=new Date(); fu.setDate(fu.getDate()+fd);
    db.contacts.push({id:uuidv4(),name,company,email,phone,source,status,assigned_to:'Abdallah',notes:'',follow_up_date:fu.toISOString().split('T')[0],activities:[],created_at:new Date().toISOString()});
  });
  const ITEMS=['Contract Signed','Kickoff Call Scheduled','Access Granted','First Deliverable Sent','30-Day Check-in Done'];
  [['Dana Aziz','Vertex Partners','dana@vertexpartners.com',48000,'2024-11-01',5,false],
   ['Omar Sheikh','Synapse Growth','omar@synapsegrowth.co',95000,'2025-01-15',3,false],
   ['Aisha Haddad','Emirates Scale','aisha@emiratesscale.ae',120000,'2025-03-01',2,false],
   ['Tom Ellsworth','Pulse Media','tom@pulsemedia.co',22000,'2025-04-01',0,false],
  ].forEach(([name,company,email,value,start,done,churned]) => {
    const cid=uuidv4();
    db.clients.push({id:cid,name,company,email,contract_value:value,start_date:start,is_churned:churned?1:0,churn_date:null,created_at:new Date().toISOString()});
    ITEMS.forEach((title,i) => db.onboarding_items.push({id:uuidv4(),client_id:cid,title,completed:i<done?1:0,is_default:1,sort_order:i}));
  });
}
seedData();
function getDb() { return db; }
module.exports = { getDb };
