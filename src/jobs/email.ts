class EmailJob {
  /**
     *
     */
  constructor(agenda: any) {
    agenda.define("registration email", async (job: any) => {
      console.log("sending email...");
      // await email(user.email(), 'Thanks for registering', 'Thanks for registering ' + user.name());
    });
  }
}
export default EmailJob;
