library(shiny)
library(miniUI)

mtInit <- function(inputValue1, inputValue2) {
  
  ui <- miniPage(
    gadgetTitleBar("mt"),
    miniContentPanel(
      # Define layout, inputs, outputs
      h4('Provide input URLs'),
      textInput('gui_txtinput', label=NULL, value='', width='100%', placeholder='Enter URLs'),
      p('ur input: ...'),
      h4('Set arguments')
      
    )
  )
  
  server <- function(input, output, session) {
    # Define reactive expressions, outputs, etc.
    
    # When the Done button is clicked, return a value
    observeEvent(input$done, {
      returnValue <- 'done'
      stopApp(returnValue)
    })
  }
  
  runGadget(ui, server)
}

mtInit()
