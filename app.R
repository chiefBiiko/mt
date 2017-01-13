library(shiny)
library(miniUI)

mtInit <- function(inputValue1, inputValue2) {
  
  ui <- miniPage(
    tags$head(tags$script('
    $(document).on("keydown", function (e) {
      Shiny.onInputChange("keyz", e.which);
    });
    ')),
    gadgetTitleBar("mt"),
    miniContentPanel(  # Define layout, inputs, outputs
      h4('Provide input URLs'),
      textInput('line', NULL, '', '100%', 'Enter URLs'),
      p('Input URLs:'),
      verbatimTextOutput('mirror'),
      br(),
      h4('Set arguments')
      
    )
  )

  server <- function(input, output, session) {
    store <- reactiveValues(uris=character())
    observeEvent(input$keyz, {  # observer, updates store conditionally
      if (grepl('^https?://[^\\.]+\\.[[:lower:]]{2,10}', input$line) & input$keyz == 13)
        store$uris[length(store$uris)+1] <- trimws(input$line)
        #clear line on submit!!
    })
    
    output$mirror <- renderPrint({ store$uris })  # let only store update ui #mirror
    
    observeEvent(input$done, { stopApp('done') })  # @param Return value
  }
  
  runGadget(ui, server)
}

mtInit()