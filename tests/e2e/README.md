# E2E Scenarios

Automate these with Playwright once dependencies are installed:

1. Register user.
2. Create project.
3. Upload the electrical PDF fixture.
4. Start processing in mocked worker mode.
5. Post a signed worker webhook fixture.
6. Review detections.
7. Recalculate budget.
8. Download CSV export.

The platform is structured so this flow can run entirely with mocked external
AI services before live Anthropic, Textract, and detector credentials exist.
