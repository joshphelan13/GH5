/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com;

import java.sql.Statement;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.*;

/**
 *
 * @author Spawn
 */
public class Query extends HttpServlet
{
    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException
    {
        String firstName, lastName, birthDate, licenseNumber;
        String action = request.getParameter("action");
        String sql = "";
        
        if (action.equalsIgnoreCase("getcourt"))
        {
            String muni = request.getParameter("muni");
            
            muni = muni.toUpperCase();
            
            sql = "SELECT * from \"municipalCourts\" WHERE UPPER(municipality) = '" + muni + "'";
        }
        else if(action.equalsIgnoreCase("getwarrants"))
        {
            firstName = request.getParameter("first").toUpperCase();
            lastName = request.getParameter("last").toUpperCase();
            birthDate = request.getParameter("birthDate");
            licenseNumber = request.getParameter("licenseNumber").toUpperCase();

            //DateFormat format = new SimpleDateFormat("MMMM d, yyyy", Locale.ENGLISH);
            //Date date = format.parse(string);
            //System.out.println(date); // Sat Jan 02 00:00:00 GMT 2010
            
            sql = "SELECT * from citations,violations where citations.citation_number = violations.citation_number " +
                    "and UPPER(citations.first_name) = '" + firstName + "'\n" +
                    "and UPPER(citations.last_name) = '" + lastName + "'\n" +
                    "and citations.date_of_birth = '" + birthDate + "'\n" +
                    "and citations.drivers_license_number = '" + licenseNumber + "'\n" +
                    "ORDER BY violations.warrant_number";
        }
        else if (action.equalsIgnoreCase("getcourtdates"))
        {
            firstName = request.getParameter("first").toUpperCase();
            lastName = request.getParameter("last").toUpperCase();
            birthDate = request.getParameter("birthDate");
            licenseNumber = request.getParameter("licenseNumber").toUpperCase();
            
            sql = "SELECT * from citations where UPPER(first_name) = '" + firstName + "' and UPPER(last_name) = '" + lastName +
                    "' and date_of_birth = '" + birthDate + "' and drivers_license_number = '" + licenseNumber + "' ORDER BY court_date";
        }
        else {
            // Unknown action
        }
        
        
        JSONArray array = new JSONArray();
        
        try {
            Class.forName("org.postgresql.Driver");

            String url = "jdbc:postgresql://localhost:5432/postgres";
            Connection conn = DriverManager.getConnection(url, "postgres", "postgres");
            
            Statement st = conn.createStatement();
            ResultSet rs = st.executeQuery(sql);
            
            if (action.equalsIgnoreCase("getcourt")) {
                while(rs.next())
                {
                    JSONObject obj = new JSONObject();
                    
                    obj.put("municipality", rs.getString("municipality"));
                    obj.put("municipalWebsite", rs.getString("municipalWebsite"));
                    obj.put("municipalCourtWebsite", rs.getString("municipalCourtWebsite"));
                    
                    array.put(obj);
                }
            }
            else if(action.equalsIgnoreCase("getcourtdates")) {
                while(rs.next())
                {
                    JSONObject obj = new JSONObject();
                    
                    obj.put("citation_number", rs.getString("citation_number"));
                    obj.put("court_date", rs.getString("court_date"));
                    obj.put("court_location", rs.getString("court_location"));
                    obj.put("court_address", rs.getString("court_address"));
                    
                    array.put(obj);
                }
            }
            else if(action.equalsIgnoreCase("getwarrants")) {
                while(rs.next())
                {
                    JSONObject obj = new JSONObject();
                    
                    obj.put("status", rs.getString("status"));
                    obj.put("warrant_number", rs.getString("warrant_number"));
                    obj.put("court_address", rs.getString("court_address"));
                    obj.put("court_location", rs.getString("court_location"));
                    
                    array.put(obj);
                }
            }
            
            rs.close();
            st.close();
        }
        catch (ClassNotFoundException | SQLException ex) {
            Logger.getLogger(Query.class.getName()).log(Level.SEVERE, null, ex);
        }
        
        
        response.setContentType("application/json");
        // Get the printwriter object from response to write the required json object to the output stream      
        PrintWriter out = response.getWriter();
        // Assuming your json object is **jsonObject**, perform the following, it will return your json object  
        out.print(array);
        out.flush();

        /*response.setContentType("text/html;charset=UTF-8");
        try (PrintWriter out = response.getWriter()) {
        // TODO output your page here. You may use following sample code.
        out.println("<!DOCTYPE html>");
        out.println("<html>");
        out.println("<head>");
        out.println("<title>Servlet Query</title>");
        out.println("</head>");
        out.println("<body>");
        out.println("<h1>Servlet Query at " + request.getContextPath() + "</h1>");
        out.println("</body>");
        out.println("</html>");
        }*/ 
    }

    /**
     * Handles the HTTP <code>GET</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException
    {
        processRequest(request, response);
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException
    {
        processRequest(request, response);
    }

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo()
    {
        return "Short description";
    }
}
