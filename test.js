let request = require("supertest");
let expect = require("chai").expect;
let app = require("./app");

describe("/GET healthz", function () {
  it("200, for healthz endpoint", async function () {
    const response = await request(app).get("/healthz");

    expect(response.status).to.eql(200);
    expect(response.body.success).to.eql(true);
  });
});
