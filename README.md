# Asana GitHub Action

This GitHub Action integrates with Asana, allowing you to automatically close Asana tasks and add comments when certain conditions are met in your GitHub repository.

## Prerequisites

1. **Asana Personal Access Token (PAT):**
   - Generate an Asana PAT from your [Asana Developer Console](https://app.asana.com/0/developer-console).
   - Add the PAT as a secret in your GitHub repository with the name `ASANA_PAT`.

## Inputs

- `asana-pat` (required): The Asana PAT used to authenticate with the Asana API.

## Example Usage

```yaml
name: Close Asana Task

on:
  push:
    branches:
      - main

jobs:
  close-asana-task:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v2

    - name: Close Asana Task
      uses: hsharma1996/close-asana-task
      with:
        asana-pat: ${{ secrets.ASANA_PAT }}
